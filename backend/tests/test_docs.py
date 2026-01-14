def test_swagger_ui_available(client):
    resp = client.get("/docs")
    assert resp.status_code == 200
    assert "Swagger UI" in resp.text


def test_openapi_available(client):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    body = resp.json()
    assert body["openapi"]

