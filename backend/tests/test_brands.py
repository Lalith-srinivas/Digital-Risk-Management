import uuid


def test_create_brand(client):
    payload = {
        "name": "Tesla Inc",
        "website": "https://www.tesla.com",
        "logo_url": "https://www.tesla.com/logo.svg",
        "official_social_urls": ["https://twitter.com/tesla"],
        "official_apps": ["com.teslamotors.tesla"],
        "official_developers": ["Tesla, Inc."],
        "aliases": ["Tesla Motors"],
    }
    response = client.post("/brands", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tesla Inc"
    assert data["website"] == "https://www.tesla.com"
    assert "id" in data
    assert data["aliases"] == ["Tesla Motors"]


def test_get_brand_by_id(client, sample_brand):
    response = client.get(f"/brands/{sample_brand.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(sample_brand.id)
    assert data["name"] == sample_brand.name


def test_get_unknown_brand_id(client):
    random_id = uuid.uuid4()
    response = client.get(f"/brands/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_brands(client, sample_brand):
    response = client.get("/brands")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(b["id"] == str(sample_brand.id) for b in data)


def test_update_brand(client, sample_brand):
    update_payload = {
        "name": "Acme Corporation International",
        "aliases": ["Acme", "Acme Int", "AI"],
    }
    response = client.put(f"/brands/{sample_brand.id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Acme Corporation International"
    assert "AI" in data["aliases"]


def test_update_unknown_brand(client):
    random_id = uuid.uuid4()
    response = client.put(f"/brands/{random_id}", json={"name": "Ghost Brand"})
    assert response.status_code == 404


def test_delete_brand(client, sample_brand):
    response = client.delete(f"/brands/{sample_brand.id}")
    assert response.status_code == 200
    assert response.json()["id"] == str(sample_brand.id)

    # Verify brand is gone
    get_res = client.get(f"/brands/{sample_brand.id}")
    assert get_res.status_code == 404


def test_delete_unknown_brand(client):
    random_id = uuid.uuid4()
    response = client.delete(f"/brands/{random_id}")
    assert response.status_code == 404


def test_brand_validation_failure(client):
    # Empty name
    response = client.post("/brands", json={"name": "   "})
    assert response.status_code == 400

    # Missing name field entirely
    res_missing = client.post("/brands", json={"website": "https://example.com"})
    assert res_missing.status_code == 422
