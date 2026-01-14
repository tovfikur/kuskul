import uuid


def _bootstrap(client):
    suffix = uuid.uuid4().hex[:8]
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"admin_comm_{suffix}@example.com",
            "password": "supersecurepassword",
            "school_name": f"Comm School {suffix}",
            "school_code": f"CM{suffix[:6].upper()}",
        },
    )
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    school_id = me.json()["memberships"][0]["school_id"]
    return token, school_id


def test_notices_notifications_messages_and_logs(client):
    token, school_id = _bootstrap(client)
    headers = {"Authorization": f"Bearer {token}", "X-School-Id": school_id}

    created_notice = client.post(
        "/api/v1/notices",
        headers=headers,
        json={"notice_type": "general", "target_audience": "all", "title": "Hello", "content": "World"},
    )
    assert created_notice.status_code == 200
    notice_id = created_notice.json()["id"]

    pub = client.patch(f"/api/v1/notices/{notice_id}/publish", headers=headers)
    assert pub.status_code == 200

    active = client.get("/api/v1/notices/active", headers=headers)
    assert active.status_code == 200
    assert any(n["id"] == notice_id for n in active.json())

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    my_user_id = me.json()["user_id"]

    sent = client.post(
        "/api/v1/notifications/send",
        headers=headers,
        json={"user_ids": [my_user_id], "notification_type": "info", "title": "T", "message": "M"},
    )
    assert sent.status_code == 200
    assert sent.json()["created"] == 1

    my_notifications = client.get("/api/v1/notifications/my?page=1&limit=20", headers=headers)
    assert my_notifications.status_code == 200
    assert my_notifications.json()["total"] >= 1
    notif_id = my_notifications.json()["items"][0]["id"]

    unread = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert unread.status_code == 200
    assert unread.json()["count"] >= 1

    mark = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert mark.status_code == 200

    other_email = f"user_comm_{uuid.uuid4().hex[:8]}@example.com"
    other = client.post(
        "/api/v1/users",
        headers=headers,
        json={"email": other_email, "password": "supersecurepassword", "role_name": "student"},
    )
    assert other.status_code == 200
    other_user_id = other.json()["id"]

    msg = client.post("/api/v1/messages/send", headers=headers, json={"recipient_id": other_user_id, "content": "Hi"})
    assert msg.status_code == 200
    message_id = msg.json()["id"]

    thread = client.get(f"/api/v1/messages/thread/{other_user_id}", headers=headers)
    assert thread.status_code == 200
    assert any(m["id"] == message_id for m in thread.json())

    conv = client.get("/api/v1/messages/conversations", headers=headers)
    assert conv.status_code == 200
    assert any(c["user_id"] == other_user_id for c in conv.json())

    sms = client.post(
        "/api/v1/communication-logs/send-sms", headers=headers, json={"recipients": ["123"], "message": "Hello"}
    )
    assert sms.status_code == 200
    assert sms.json()["created"] == 1

    logs = client.get("/api/v1/communication-logs", headers=headers)
    assert logs.status_code == 200
    assert len(logs.json()) >= 1

