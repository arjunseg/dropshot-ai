import uuid
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


def _get_client() -> "boto3.client":  # type: ignore[name-defined]
    kwargs: dict = {
        "region_name": settings.aws_s3_region,
        "aws_access_key_id": settings.aws_access_key_id,
        "aws_secret_access_key": settings.aws_secret_access_key,
        "config": Config(signature_version="s3v4"),
    }
    if settings.aws_s3_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
    return boto3.client("s3", **kwargs)


def generate_upload_key(user_id: str, filename: str) -> str:
    ext = Path(filename).suffix.lower() or ".mp4"
    return f"videos/{user_id}/{uuid.uuid4()}{ext}"


def generate_thumbnail_key(video_key: str) -> str:
    stem = Path(video_key).stem
    parent = Path(video_key).parent
    return f"{parent}/{stem}_thumb.jpg"


def generate_pose_data_key(video_key: str) -> str:
    stem = Path(video_key).stem
    parent = Path(video_key).parent
    return f"{parent}/{stem}_pose.json"


def create_presigned_upload_url(s3_key: str, content_type: str, expires_in: int = 900) -> str:
    """Generate a presigned PUT URL for direct client upload to S3."""
    client = _get_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.aws_s3_bucket,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def create_presigned_download_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned GET URL for client video playback."""
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def download_to_temp(s3_key: str, local_path: Path) -> None:
    """Download an S3 object to a local file path (used by the pipeline worker)."""
    client = _get_client()
    client.download_file(settings.aws_s3_bucket, s3_key, str(local_path))


def upload_file(local_path: Path, s3_key: str, content_type: str = "application/octet-stream") -> None:
    """Upload a local file to S3 (used by the pipeline to store pose data / thumbnails)."""
    client = _get_client()
    client.upload_file(
        str(local_path),
        settings.aws_s3_bucket,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )


def upload_bytes(data: bytes, s3_key: str, content_type: str = "application/octet-stream") -> None:
    client = _get_client()
    client.put_object(
        Body=data,
        Bucket=settings.aws_s3_bucket,
        Key=s3_key,
        ContentType=content_type,
    )


def delete_object(s3_key: str) -> None:
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.aws_s3_bucket, Key=s3_key)
    except ClientError:
        pass  # Best-effort delete
