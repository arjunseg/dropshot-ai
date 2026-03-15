from datetime import datetime

from pydantic import BaseModel


class SubscriptionResponse(BaseModel):
    id: str
    plan: str
    status: str
    is_pro: bool
    current_period_end: datetime | None
    cancel_at_period_end: bool

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalRequest(BaseModel):
    return_url: str


class PortalResponse(BaseModel):
    portal_url: str


class UsageStats(BaseModel):
    analyses_this_month: int
    monthly_limit: int
    is_pro: bool
    remaining: int
