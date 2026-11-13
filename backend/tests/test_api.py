from jsonschema import validate


def test_health_meta(client):
    assert client.get("/api/health").json()["status"] == "ok"
    meta = client.get("/api/meta").json()
    assert meta["corpus"]["investigations"] == 34
    assert not meta["llm_available"]
    assert meta["features"]["analysis_lab"] is False


def test_source_flow(client, schemas):
    result = client.post(
        "/api/search/investigations",
        json={"query": "suppression carbon dioxide helium droplet flames"},
    ).json()
    assert "PSI-69" in [r["investigation_id"] for r in result["results"][:3]]
    ev = client.get("/api/evidence/" + result["results"][0]["evidence_id"])
    validate(ev.json(), schemas["evidence"])
    page = client.get("/api/documents/doc:NTRS-20150023456-1/pages/26").json()
    assert "mm2/s" in page["text"]
    assert (
        client.get(page["local_pdf_url"].split("#")[0]).headers["content-type"] == "application/pdf"
    )


def test_chart_and_export(client, schemas):
    response = client.post(
        "/api/charts",
        json={
            "table_ids": ["PSI-69:flex_experimental"],
            "x": "o2_mole_fraction",
            "y": "burning_rate_constant",
        },
    )
    assert response.status_code == 200
    art = response.json()["artifact"]
    validate(art, schemas["artifact"])
    assert client.get(f"/api/artifacts/{art['artifact_id']}/bundle").content.startswith(b"PK")
    csv = client.get("/api/datasets/PSI-69:flex_experimental/export")
    assert "sha256" in csv.text.splitlines()[0]
    assert "source_row" in csv.text


def test_media_ranges_and_security(client):
    items = client.get("/api/media?investigation_id=PSI-69").json()
    assert items
    media = items[0]
    response = client.get(media["stream_url"], headers={"Range": "bytes=0-1023"})
    assert response.status_code == 206
    assert len(response.content) == 1024
    assert response.headers["Content-Range"].startswith("bytes 0-1023/")
    bad = client.get(media["stream_url"], headers={"Range": "bytes=9999999999999-"})
    assert bad.status_code == 416
    assert client.get("/api/files/.env/original").status_code == 404
    assert client.post("/api/admin/cache/purge").status_code == 403
    assert client.get("/api/health").headers["X-Request-Id"].startswith("req_")


def test_validation_failures(client):
    response = client.post(
        "/api/charts",
        json={"table_ids": ["PSI-69:flex_experimental"], "x": "invented", "y": "burn_time"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_argument"
    assert client.post("/api/search/documents", json={"query": "x" * 70000}).status_code == 413
    assert client.post("/api/charts", json={"code": "import os"}).status_code == 422


def test_sessions_missing_key_and_sandbox(client):
    sid = client.post("/api/sessions", json={}).json()["session_id"]
    assert any(row["session_id"] == sid for row in client.get("/api/sessions").json())
    assert client.get(f"/api/sessions/{sid}").status_code == 200
    assert (
        client.post(f"/api/sessions/{sid}/messages", json={"text": "NASA extinction"}).status_code
        == 503
    )
    assert client.patch(f"/api/sessions/{sid}", json={"analysis_lab": True}).status_code == 409
    assert client.post(f"/api/sessions/{sid}/cancel").json() == {"cancelled": False}


def test_contract_routes_exist(client):
    paths = client.get("/api/openapi.json").json()["paths"]
    for name in [
        "health",
        "meta",
        "vocab",
        "investigations",
        "datasets",
        "media",
        "sessions",
        "replays",
        "charts",
        "compare",
        "envelope",
        "checks/d2law",
        "search/investigations",
        "search/documents",
        "measurements/query",
    ]:
        assert "/api/" + name in paths


def test_visitor_thread_isolation(client):
    a = client.post("/api/sessions", json={"title": "Private A"}).json()["session_id"]
    cookie = client.cookies.get("embernova_visitor")
    assert client.get(f"/api/sessions/{a}").status_code == 200
    client.cookies.clear()
    assert client.get("/api/sessions").json() == []
    b = client.post("/api/sessions", json={"title": "Private B"}).json()["session_id"]
    assert [s["session_id"] for s in client.get("/api/sessions").json()] == [b]
    for method, suffix, body in [
        ("get", "", None),
        ("get", "/turns/guessed/events", None),
        ("post", "/cancel", {}),
        ("post", "/messages", {"text": "secret"}),
        ("patch", "", {"analysis_lab": True}),
    ]:
        kwargs = {"json": body} if body is not None else {}
        assert client.request(method, f"/api/sessions/{a}{suffix}", **kwargs).status_code == 404
    client.cookies.clear()
    client.cookies.set("embernova_visitor", cookie)
    assert client.get(f"/api/sessions/{a}").status_code == 200
    assert client.get(f"/api/sessions/{b}").status_code == 404
    assert (
        client.post(
            "/api/sessions", json={}, headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
