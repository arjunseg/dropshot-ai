from pydantic import BaseModel, Field


class PresignedUrlRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(pattern=r"^video/")
    file_size_bytes: int = Field(gt=0)
    shot_type: str = "third_shot_drop"


class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    expires_in_seconds: int


class ConfirmUploadRequest(BaseModel):
    s3_key: str
    shot_type: str = "third_shot_drop"


class ConfirmUploadResponse(BaseModel):
    analysis_id: str
    status: str
