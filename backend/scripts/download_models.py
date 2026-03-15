"""
Download required ML model weights.

Run: python -m scripts.download_models

Downloads:
- YOLOv8n base weights (for fine-tuning or as fallback if custom model not available)
- Custom paddle detector (from your model registry once trained)
"""
import os
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def download_yolov8_base():
    """Download YOLOv8n base weights via ultralytics."""
    print("Downloading YOLOv8n base weights...")
    try:
        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")
        target = MODELS_DIR / "yolov8n.pt"
        # ultralytics downloads to default cache; copy to our models dir
        import shutil
        cache_path = Path.home() / ".cache" / "ultralytics" / "yolov8n.pt"
        if cache_path.exists():
            shutil.copy(cache_path, target)
        print(f"YOLOv8n saved to {target}")
    except ImportError:
        print("ultralytics not installed — skipping YOLOv8n download")


def check_paddle_model():
    """Check if custom paddle detection model exists."""
    paddle_path = MODELS_DIR / "paddle_detector_v1.pt"
    if paddle_path.exists():
        print(f"Paddle model found: {paddle_path} ({paddle_path.stat().st_size / 1e6:.1f}MB)")
    else:
        print(f"Paddle model NOT found at {paddle_path}")
        print("To train the paddle detector, run: python ml/train/train_paddle_detector.py")
        print("Until trained, the pipeline falls back to wrist-position heuristics.")


if __name__ == "__main__":
    download_yolov8_base()
    check_paddle_model()
    print("\nDone. Model directory contents:")
    for f in sorted(MODELS_DIR.iterdir()):
        print(f"  {f.name} ({f.stat().st_size / 1e6:.1f}MB)")
