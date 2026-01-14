import time
from collections import defaultdict, deque
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitRule:
    window_seconds: int
    max_requests: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, *, key: str, rule: RateLimitRule) -> bool:
        now = time.time()
        bucket = self._buckets[key]
        cutoff = now - rule.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= rule.max_requests:
            return False
        bucket.append(now)
        return True

