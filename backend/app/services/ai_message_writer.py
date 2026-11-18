"""Small local-LLM client used only to write absence SMS bodies.

The deterministic policy in :mod:`app.services.absence_sms` decides whether a
message is sent.  This module asks a local llama.cpp sidecar for wording and
falls back to the existing school template if the model is unavailable or the
output fails strict fact/format validation.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_AI_UNAVAILABLE_UNTIL = 0.0
_AI_COOLDOWN_SECONDS = 30.0
_FORBIDDEN_RE = re.compile(
    r"\b(sick|ill|illness|fever|hospital|doctor|died|death|accident|emergency|medical|chatgpt|openai|language model)\b",
    re.IGNORECASE,
)
_PREFIX_RE = re.compile(r"^(?:sms|message|subject)\s*[:\-]\s*", re.IGNORECASE)
_DIGITS_RE = re.compile(r"\d+")
_GREETING_RE = re.compile(r"^(dear guardian|প্রিয় অভিভাবক)", re.IGNORECASE)
_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
_SIGNOFF_RE = re.compile(
    r"\b(best regards|kind regards|sincerely|your name|\[your name\]|regards,|principal|school management)\b",
    re.IGNORECASE,
)
_NUMBER_WORDS = {
    1: ("one", "first", "1st", "এক", "প্রথম"),
    2: ("two", "second", "2nd", "দুই", "দ্বিতীয়"),
    3: ("three", "third", "3rd", "তিন", "তৃতীয়"),
    4: ("four", "fourth", "4th", "চার", "চতুর্থ"),
    5: ("five", "fifth", "5th", "পাঁচ", "পঞ্চম"),
    6: ("six", "sixth", "6th", "ছয়", "ষষ্ঠ"),
    7: ("seven", "seventh", "7th", "সাত", "সপ্তম"),
    8: ("eight", "eighth", "8th", "আট", "অষ্টম"),
    9: ("nine", "ninth", "9th", "নয়", "নবম"),
    10: ("ten", "tenth", "10th", "দশ", "দশম"),
}


def language_for(policy: dict, medium: str | None) -> str:
    configured = str(policy.get("ai_sms_language") or "auto").strip().lower()
    if configured in {"bn", "bangla", "bengali"}:
        return "bn"
    if configured in {"en", "english"}:
        return "en"
    return "bn" if str(medium or "").strip().lower().startswith(("bangla", "bengali")) else "en"


def _max_parts(policy: dict) -> int:
    try:
        return max(1, min(4, int(policy.get("ai_sms_max_parts", 1))))
    except (TypeError, ValueError):
        return 1


def _max_chars(language: str, policy: dict) -> int:
    return (70 if language == "bn" else 160) * _max_parts(policy)


_TO_BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")


def _bn_digits(text: str) -> str:
    return text.translate(_TO_BN_DIGITS)


def _fallback_template(policy: dict, context: dict, language: str) -> str:
    name = str(context.get("student_name") or "your child")
    date_text = str(context.get("date") or context.get("return_date") or "")
    if context.get("message_type") == "return_summary":
        days = int(context.get("absence_days") or 0)
        start = str(context.get("absence_start_date") or "")
        end = str(context.get("absence_end_date") or "")
        arrived = str(context.get("return_time") or "")
        late = bool(context.get("returned_late"))
        status_en = "late" if late else "on time"
        month_absent = int(context.get("total_absent_days_this_month") or 0)
        month_late = int(context.get("total_late_days_this_month") or 0)
        if language == "bn":
            when = f" {arrived}-এ" if arrived else ""
            return _bn_digits(
                f"প্রিয় অভিভাবক, {name} আজ{when} ফিরেছে ({'দেরিতে' if late else 'সময়মতো'})। "
                f"সে {days} স্কুল দিন অনুপস্থিত ছিল ({start}–{end})। "
                f"এ মাসে {month_absent} দিন অনুপস্থিত, {month_late} দিন দেরিতে।"
            )
        absence_word = "absence" if month_absent == 1 else "absences"
        late_word = "late day" if month_late == 1 else "late days"
        return (
            f"Dear guardian, {name} returned today{' at ' + arrived if arrived else ''} ({status_en}). "
            f"Absent {days} school days ({start} to {end}). "
            f"This month: {month_absent} {absence_word}, {month_late} {late_word}."
        )
    template = str(policy.get("absent_sms_template") or "").strip()
    template_is_bangla = bool(re.search(r"[\u0980-\u09FF]", template))
    if template and template_is_bangla == (language == "bn"):
        return (
            template.replace("{{student_name}}", name)
            .replace("{{date}}", date_text)
            .replace("{{time}}", str(policy.get("attendance_end_time", policy.get("attendance_cutoff_time", "17:00"))))
            .replace("{{streak_days}}", str(context.get("absence_streak_days") or 0))
        )
    streak = int(context.get("absence_streak_days") or 0)
    if language == "bn":
        return _bn_digits(
            f"প্রিয় অভিভাবক, {name} আজ ({date_text}) অনুপস্থিত। এটি টানা {streak} দিন। অপ্রত্যাশিত হলে বিদ্যালয়ে যোগাযোগ করুন।"
        )
    return f"Dear guardian, {name} was absent today ({date_text}). This is day {streak} of absence. Please contact the school office if unexpected."


def _allowed_numbers(context: dict, policy: dict) -> set[str]:
    values: list[Any] = list(context.values()) + [policy.get("absent_sms_first_days", 0)]
    allowed: set[str] = set()
    for value in values:
        if isinstance(value, bool) or value is None:
            continue
        if isinstance(value, (int, float)):
            allowed.add(str(int(value)))
            continue
        for raw in _DIGITS_RE.findall(str(value)):
            allowed.add(raw)
            try:
                allowed.add(str(int(raw)))
            except ValueError:
                pass
    return allowed


def _has_number(text: str, value: int) -> bool:
    normalized = text.translate(_BN_DIGITS)
    if str(value) in normalized:
        return True
    lowered = normalized.lower()
    return any(word.lower() in lowered for word in _NUMBER_WORDS.get(value, ()))


def _valid_text(text: str, *, context: dict, policy: dict, language: str) -> tuple[bool, str]:
    text = " ".join(text.strip().split())
    if not text:
        return False, "empty"
    if "\n" in text or "{{" in text or "}}" in text:
        return False, "format"
    if len(text) > _max_chars(language, policy):
        return False, "too_long"
    if not _GREETING_RE.search(text):
        return False, "greeting"
    has_bangla = bool(re.search(r"[\u0980-\u09FF]", text))
    if language == "bn" and not has_bangla:
        return False, "wrong_language"
    if language == "en" and has_bangla:
        return False, "wrong_language"
    name = str(context.get("student_name") or "").strip()
    if name and name.split()[0].lower() not in text.lower():
        return False, "missing_name"
    if context.get("message_type") == "daily_absence":
        streak = int(context.get("absence_streak_days") or 0)
        if streak > 1 and not _has_number(text, streak):
            return False, "missing_streak"
    if context.get("message_type") == "return_summary":
        days = int(context.get("absence_days") or 0)
        if not _has_number(text, days):
            return False, "missing_absence_days"
    if _SIGNOFF_RE.search(text):
        return False, "signoff"
    allowed = _allowed_numbers(context, policy)
    for raw in _DIGITS_RE.findall(text.translate(_BN_DIGITS)):
        if raw not in allowed and str(int(raw)) not in allowed:
            return False, "unknown_number"
    if _FORBIDDEN_RE.search(text):
        return False, "invented_reason"
    return True, ""


def _call_ai(messages: list[dict], *, max_tokens: int) -> str | None:
    global _AI_UNAVAILABLE_UNTIL
    if time.monotonic() < _AI_UNAVAILABLE_UNTIL:
        return None
    base_url = str(getattr(settings, "ai_writer_url", "") or "").strip().rstrip("/")
    if not base_url:
        return None
    timeout = float(getattr(settings, "ai_writer_timeout_seconds", 20.0) or 20.0)
    try:
        response = httpx.post(
            f"{base_url}/generate",
            json={
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.2,
                "top_p": 0.9,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        text = data.get("text") if isinstance(data, dict) else None
        _AI_UNAVAILABLE_UNTIL = 0.0
        return str(text) if text else None
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        _AI_UNAVAILABLE_UNTIL = time.monotonic() + _AI_COOLDOWN_SECONDS
        logger.info("AI SMS writer unavailable; using fallback: %s", exc)
        return None


def _compose(context: dict, policy: dict) -> str:
    language = language_for(policy, context.get("medium"))
    if not policy.get("ai_sms_writer_enabled", True):
        return _fallback_template(policy, context, language)
    if language == "bn" and not policy.get("ai_sms_bangla_enabled", False):
        # The small local model is not reliable enough for Bangla; use the
        # deterministic Bangla fallback unless an administrator opts in.
        return _fallback_template(policy, context, language)
    tone = str(policy.get("ai_sms_tone") or "friendly").strip().lower()
    if tone not in {"friendly", "formal", "concise"}:
        tone = "friendly"
    max_chars = _max_chars(language, policy)
    language_name = "Bangla" if language == "bn" else "English"
    system = (
        "You write short, polite school SMS messages to guardians. "
        "Use ONLY the facts in the JSON. Never invent names, dates, numbers, reasons, or medical details. "
        f"Write in {language_name}. Tone: {tone}. Maximum {max_chars} characters. "
        "Output only the SMS text, with no quotes, labels, or explanation. "
        "Do not write a subject line, heading, greeting-only reply, signature, or sign-off. "
        "Start directly with Dear guardian, or প্রিয় অভিভাবক, as appropriate. "
        "Include the student's name and the required absence facts. "
        "Use the exact absence day number, for example 'day 2'. "
        "Do not blame or shame the child. Do not mention AI."
    )
    if context.get("message_type") == "return_summary":
        if language == "bn":
            example_facts = (
                '{"message_type":"return_summary","student_name":"Nusrat Jahan","medium":"Bangla",'
                '"absence_days":5,"absence_start_date":"2026-01-01","absence_end_date":"2026-01-07",'
                '"return_date":"2026-01-08","return_time":"09:10","returned_late":true,'
                '"total_absent_days_this_month":5,"total_late_days_this_month":1,'
                '"school_name":"Green Valley School"}'
            )
            example_sms = (
                "প্রিয় অভিভাবক, Nusrat Jahan আজ ০৯:১০-এ ফিরেছে (দেরিতে)। "
                "সে ৫ স্কুল দিন অনুপস্থিত ছিল। এ মাসে ৫ দিন অনুপস্থিত, ১ দিন দেরিতে।"
            )
        else:
            example_facts = (
                '{"message_type":"return_summary","student_name":"Nusrat Jahan","medium":"English",'
                '"absence_days":5,"absence_start_date":"2026-01-01","absence_end_date":"2026-01-07",'
                '"return_date":"2026-01-08","return_time":"09:10","returned_late":true,'
                '"total_absent_days_this_month":5,"total_late_days_this_month":1,'
                '"school_name":"Green Valley School"}'
            )
            example_sms = (
                "Dear guardian, Nusrat returned today at 09:10 (late). "
                "She was absent for 5 school days. This month: 5 absences and 1 late day."
            )
    else:
        if language == "bn":
            example_facts = (
                '{"message_type":"daily_absence","student_name":"Nusrat Jahan","medium":"Bangla",'
                '"date":"2026-01-05","absence_streak_days":3,"total_absent_days_this_month":3,'
                '"total_late_days_this_month":0,"school_name":"Green Valley School"}'
            )
            example_sms = (
                "প্রিয় অভিভাবক, Nusrat Jahan আজ অনুপস্থিত (৫ জানুয়ারি ২০২৬)। "
                "এটি টানা ৩ দিন। অপ্রত্যাশিত হলে বিদ্যালয়ে যোগাযোগ করুন।"
            )
        else:
            example_facts = (
                '{"message_type":"daily_absence","student_name":"Nusrat Jahan","medium":"English",'
                '"date":"2026-01-05","absence_streak_days":3,"total_absent_days_this_month":3,'
                '"total_late_days_this_month":0,"school_name":"Green Valley School"}'
            )
            example_sms = (
                "Dear guardian, Nusrat was absent today (5 Jan 2026). This is day 3 of absence. "
                "Please contact the school office if this is unexpected."
            )
    user = (
        "Example facts:\n"
        + example_facts
        + "\nExample SMS:\n"
        + example_sms
        + "\n\nNow write the SMS for these facts, not the example facts:\n"
        + json.dumps(context, ensure_ascii=False)
    )
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    for attempt in range(2):
        raw = _call_ai(messages, max_tokens=120 if attempt == 0 else 90)
        if not raw:
            break
        text = _PREFIX_RE.sub("", raw).strip().strip("\"'“”‘’").strip()
        ok, _reason = _valid_text(text, context=context, policy=policy, language=language)
        if ok:
            return text
        if attempt == 0:
            messages.append({"role": "assistant", "content": text})
            messages.append(
                {
                    "role": "user",
                    "content": (
                    "That version failed validation. Write a complete SMS body, no subject or sign-off, "
                    "using only the exact JSON facts and the exact absence number as a digit."
                ),
                }
            )
    return _fallback_template(policy, context, language)


def compose_daily_absence(context: dict, policy: dict) -> str:
    return _compose(context, policy)


def compose_return_summary(context: dict, policy: dict) -> str:
    return _compose(context, policy)
