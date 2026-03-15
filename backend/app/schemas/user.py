from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    skill_level: float | None
    expo_push_token: str | None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    skill_level: float | None = Field(default=None, ge=1.0, le=6.0)
    expo_push_token: str | None = None
