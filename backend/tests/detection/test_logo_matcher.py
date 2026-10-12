"""Tests for logo and icon similarity matcher."""

import io
import pytest
from PIL import Image, ImageDraw

from backend.app.detection.logo_matcher import compare_images, compute_perceptual_hashes


@pytest.fixture
def sample_logo_a():
    """Create a synthetic 100x100 blue square with a red circle."""
    img = Image.new("RGBA", (100, 100), color=(0, 0, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse((25, 25, 75, 75), fill=(255, 0, 0, 255))
    return img


@pytest.fixture
def sample_logo_a_bytes(sample_logo_a):
    """PNG bytes of sample_logo_a."""
    bio = io.BytesIO()
    sample_logo_a.save(bio, format="PNG")
    return bio.getvalue()


@pytest.fixture
def sample_logo_b():
    """Create a completely distinct image (green triangle on white)."""
    img = Image.new("RGBA", (100, 100), color=(255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.polygon([(50, 10), (90, 90), (10, 90)], fill=(0, 255, 0, 255))
    return img


def test_missing_images_handling():
    """Missing brand or candidate image should mark signal unavailable."""
    res1 = compare_images(None, None)
    assert res1["compared"] is False
    assert res1["status"] == "unavailable"
    assert res1["similarity_score"] is None

    res2 = compare_images("valid_path.png", None)
    assert res2["compared"] is False
    assert res2["status"] == "unavailable"


def test_invalid_image_handling():
    """Corrupted bytes, 0-byte buffer, or non-existent file should be gracefully handled."""
    # Corrupted data
    res_corrupt = compare_images(b"not an image data", b"corrupted payload")
    assert res_corrupt["compared"] is False
    assert res_corrupt["status"] == "invalid_image"
    assert res_corrupt["similarity_score"] is None

    # Empty bytes
    res_empty = compare_images(b"", b"")
    assert res_empty["compared"] is False
    assert res_empty["status"] == "invalid_image"

    # Non-existent file path
    res_missing_file = compare_images("non_existent_brand_logo.png", "non_existent_cand.png")
    assert res_missing_file["compared"] is False
    assert res_missing_file["status"] == "invalid_image"


def test_identical_image_matching(sample_logo_a, sample_logo_a_bytes):
    """Identical images should yield Hamming distance 0 and 100% similarity."""
    res = compare_images(sample_logo_a, sample_logo_a_bytes)
    assert res["compared"] is True
    assert res["status"] == "completed"
    assert res["hash_distance"] == 0
    assert res["similarity_score"] == 100.0
    assert res["is_visual_match"] is True


def test_compressed_or_resized_variant(sample_logo_a):
    """Resized or minorly modified version of the same logo should remain highly similar."""
    # Resize to 64x64
    resized = sample_logo_a.resize((64, 64))
    res = compare_images(sample_logo_a, resized)
    assert res["compared"] is True
    assert res["hash_distance"] <= 4
    assert res["similarity_score"] >= 90.0
    assert res["is_visual_match"] is True


def test_visually_distinct_images(sample_logo_a, sample_logo_b):
    """Completely distinct logos should yield high Hamming distance and low similarity."""
    res = compare_images(sample_logo_a, sample_logo_b)
    assert res["compared"] is True
    assert res["hash_distance"] > 15
    assert res["is_visual_match"] is False
