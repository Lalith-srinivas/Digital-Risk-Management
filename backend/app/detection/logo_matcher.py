"""Logo and icon similarity matcher for SOC 360.

Uses Pillow and ImageHash to perform perceptual hashing and Hamming distance
comparison between authorized local or supplied brand logos and candidate profile/app images.
"""

from __future__ import annotations

import io
import os
from typing import Any, Dict, Optional, Tuple, Union

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    Image = None  # type: ignore
    UnidentifiedImageError = Exception  # type: ignore

try:
    import imagehash
except ImportError:
    imagehash = None  # type: ignore


ImageInput = Union[str, bytes, io.BytesIO, "Image.Image"]


def _load_image(source: Optional[ImageInput]) -> Tuple[Optional["Image.Image"], Optional[str]]:
    """Safely open an image from a path, raw bytes, BytesIO, or existing PIL Image.

    Returns:
        (image_obj, error_message)
    """
    if source is None:
        return None, "No image source provided"

    if Image is None:
        return None, "Pillow library is not installed in the environment"

    # Already a PIL Image
    if isinstance(source, Image.Image):
        try:
            # Create a copy in RGB or RGBA mode to ensure loaded
            converted = source.convert("RGBA")
            return converted, None
        except Exception as e:
            return None, f"Failed to process existing PIL image: {str(e)}"

    # Raw bytes
    if isinstance(source, (bytes, bytearray)):
        if len(source) == 0:
            return None, "Empty image byte sequence"
        try:
            bio = io.BytesIO(source)
            img = Image.open(bio)
            img.load()
            return img.convert("RGBA"), None
        except (UnidentifiedImageError, OSError) as e:
            return None, f"Invalid or corrupted image data: {str(e)}"
        except Exception as e:
            return None, f"Unexpected image decoding error: {str(e)}"

    # BytesIO buffer
    if isinstance(source, io.BytesIO):
        try:
            source.seek(0)
            data = source.read()
            if not data:
                return None, "Empty BytesIO buffer"
            source.seek(0)
            img = Image.open(source)
            img.load()
            return img.convert("RGBA"), None
        except (UnidentifiedImageError, OSError) as e:
            return None, f"Invalid image in buffer: {str(e)}"
        except Exception as e:
            return None, f"Unexpected error reading image buffer: {str(e)}"

    # Local file path
    if isinstance(source, str):
        if not source.strip():
            return None, "Empty image path string"
        if not os.path.exists(source):
            return None, f"Image file not found: {source}"
        if not os.path.isfile(source):
            return None, f"Target path is not a file: {source}"
        if os.path.getsize(source) == 0:
            return None, f"Image file is 0 bytes: {source}"

        try:
            with Image.open(source) as img:
                img.load()
                return img.convert("RGBA"), None
        except (UnidentifiedImageError, OSError) as e:
            return None, f"Corrupted or invalid image file '{source}': {str(e)}"
        except Exception as e:
            return None, f"Failed to open image file '{source}': {str(e)}"

    return None, f"Unsupported image source type: {type(source).__name__}"


def compute_perceptual_hashes(img: "Image.Image") -> Dict[str, Any]:
    """Compute perceptual hashes (phash, dhash, average_hash) for a PIL Image."""
    if imagehash is None:
        raise RuntimeError("ImageHash library is not installed")

    # Composite with white background for transparent PNG/WebP to standardize hashes
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    alpha_composite = Image.alpha_composite(bg, img).convert("RGB")

    return {
        "phash": imagehash.phash(alpha_composite),
        "dhash": imagehash.dhash(alpha_composite),
        "average_hash": imagehash.average_hash(alpha_composite),
    }


def compare_images(
    brand_image: Optional[ImageInput],
    candidate_image: Optional[ImageInput],
    hash_algorithm: str = "phash",
    match_distance_threshold: int = 10,
) -> Dict[str, Any]:
    """Compare a brand logo against a candidate logo/icon using perceptual hashing.

    Args:
        brand_image: Path, bytes, or PIL Image of official brand logo.
        candidate_image: Path, bytes, or PIL Image of candidate profile/app icon.
        hash_algorithm: Perceptual hash algorithm ('phash', 'dhash', 'average_hash').
        match_distance_threshold: Hamming distance threshold (default <= 10 for 64-bit hash)
                                  indicating strong visual similarity.

    Returns:
        Structured dictionary conforming to SOC 360 detection standards.
    """
    # 1. Missing image handling
    if brand_image is None or candidate_image is None:
        missing_party = (
            "both brand and candidate images"
            if (brand_image is None and candidate_image is None)
            else ("brand logo" if brand_image is None else "candidate icon")
        )
        return {
            "compared": False,
            "status": "unavailable",
            "hash_distance": None,
            "similarity_score": None,
            "is_visual_match": False,
            "explanation": f"Image comparison unavailable: missing {missing_party}.",
            "details": {"missing": missing_party},
        }

    # 2. Safely load and validate both images
    img1, err1 = _load_image(brand_image)
    if err1 or img1 is None:
        return {
            "compared": False,
            "status": "invalid_image",
            "hash_distance": None,
            "similarity_score": None,
            "is_visual_match": False,
            "explanation": f"Brand logo could not be processed: {err1}.",
            "details": {"brand_image_error": err1},
        }

    img2, err2 = _load_image(candidate_image)
    if err2 or img2 is None:
        return {
            "compared": False,
            "status": "invalid_image",
            "hash_distance": None,
            "similarity_score": None,
            "is_visual_match": False,
            "explanation": f"Candidate image could not be processed: {err2}.",
            "details": {"candidate_image_error": err2},
        }

    # Check dependencies
    if imagehash is None:
        return {
            "compared": False,
            "status": "error",
            "hash_distance": None,
            "similarity_score": None,
            "is_visual_match": False,
            "explanation": "ImageHash package is not installed; image comparison skipped.",
            "details": {},
        }

    # 3. Compute perceptual hashes
    try:
        brand_hashes = compute_perceptual_hashes(img1)
        cand_hashes = compute_perceptual_hashes(img2)
    except Exception as e:
        return {
            "compared": False,
            "status": "error",
            "hash_distance": None,
            "similarity_score": None,
            "is_visual_match": False,
            "explanation": f"Error calculating perceptual hash: {str(e)}.",
            "details": {"exception": str(e)},
        }

    # 4. Hamming distance calculation
    selected_hash = hash_algorithm if hash_algorithm in brand_hashes else "phash"
    h1 = brand_hashes[selected_hash]
    h2 = cand_hashes[selected_hash]

    hamming_dist = int(h1 - h2)
    # 64-bit standard hash length
    hash_bits = len(h1.hash.flatten()) if hasattr(h1, "hash") else 64

    # Normalized similarity: 0 to 100 scale
    # Hamming distance 0 -> 100%, 64 -> 0%
    linear_sim = max(0.0, 1.0 - (hamming_dist / float(hash_bits))) * 100.0
    normalized_similarity = round(linear_sim, 2)

    is_visual_match = hamming_dist <= match_distance_threshold

    # Calibrate explanation
    if hamming_dist == 0:
        explanation = (
            f"Candidate image is visually identical (Hamming distance 0/{hash_bits}) "
            "to the registered brand logo."
        )
    elif hamming_dist <= 5:
        explanation = (
            f"Candidate image shows near-identical visual features (Hamming distance {hamming_dist}/{hash_bits}, "
            f"similarity {normalized_similarity:.1f}%) to the brand logo."
        )
    elif hamming_dist <= match_distance_threshold:
        explanation = (
            f"Candidate image has high visual similarity (Hamming distance {hamming_dist}/{hash_bits}, "
            f"similarity {normalized_similarity:.1f}%) to the brand logo."
        )
    elif hamming_dist <= 20:
        explanation = (
            f"Candidate image has moderate visual similarity (Hamming distance {hamming_dist}/{hash_bits}, "
            f"similarity {normalized_similarity:.1f}%); logo match is inconclusive."
        )
    else:
        explanation = (
            f"Candidate image is visually distinct from the brand logo "
            f"(Hamming distance {hamming_dist}/{hash_bits}, similarity {normalized_similarity:.1f}%)."
        )

    return {
        "compared": True,
        "status": "completed",
        "hash_distance": hamming_dist,
        "similarity_score": normalized_similarity,
        "is_visual_match": is_visual_match,
        "explanation": explanation,
        "details": {
            "algorithm": selected_hash,
            "brand_hash": str(h1),
            "candidate_hash": str(h2),
            "phash_distance": int(brand_hashes["phash"] - cand_hashes["phash"]),
            "dhash_distance": int(brand_hashes["dhash"] - cand_hashes["dhash"]),
            "hash_bits": hash_bits,
        },
    }
