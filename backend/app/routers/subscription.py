from datetime import UTC, datetime

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, get_current_user_with_subscription
from app.models.analysis import Analysis, AnalysisStatus
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PortalRequest,
    PortalResponse,
    SubscriptionResponse,
    UsageStats,
)
from app.services import stripe_service

settings = get_settings()
router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("", response_model=SubscriptionResponse)
async def get_subscription(user: User = Depends(get_current_user_with_subscription)):
    sub = user.subscription
    return SubscriptionResponse.model_validate(sub)


@router.get("/usage", response_model=UsageStats)
async def get_usage(
    user: User = Depends(get_current_user_with_subscription),
    db: AsyncSession = Depends(get_db),
):
    is_pro = user.subscription.is_pro if user.subscription else False

    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(func.count(Analysis.id)).where(
            Analysis.user_id == user.id,
            Analysis.created_at >= month_start,
            Analysis.status != AnalysisStatus.FAILED,
        )
    )
    count = result.scalar_one()

    limit = settings.free_tier_monthly_limit
    return UsageStats(
        analyses_this_month=count,
        monthly_limit=limit,
        is_pro=is_pro,
        remaining=max(0, limit - count) if not is_pro else 9999,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get or create Stripe customer
    customer_id = stripe_service.get_or_create_customer(user.id, user.email)

    # Save customer ID to user record
    if not user.stripe_customer_id:
        user.stripe_customer_id = customer_id
        await db.commit()

    checkout_url, session_id = stripe_service.create_checkout_session(
        customer_id=customer_id,
        price_id=body.price_id,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        user_id=user.id,
    )

    return CheckoutResponse(checkout_url=checkout_url, session_id=session_id)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    body: PortalRequest,
    user: User = Depends(get_current_user),
):
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    portal_url = stripe_service.create_portal_session(user.stripe_customer_id, body.return_url)
    return PortalResponse(portal_url=portal_url)


@router.post("/webhook/stripe", status_code=200)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str = Header(alias="stripe-signature"),
):
    """Handle Stripe webhook events to sync subscription state."""
    payload = await request.body()

    try:
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
    except (stripe.SignatureVerificationError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature invalid: {e}")

    if event.type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        sub_data = stripe_service.parse_subscription_from_event(event)
        customer_id = sub_data["stripe_customer_id"]

        # Find user by Stripe customer ID
        result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
        user = result.scalar_one_or_none()

        if not user:
            # Try to find via metadata
            return {"received": True}

        # Determine plan from price
        price_id = sub_data.get("price_id", "")
        plan = Plan.PRO if price_id == settings.stripe_pro_price_id else Plan.FREE

        # Upsert subscription record
        result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
        sub = result.scalar_one_or_none()

        if sub:
            sub.stripe_subscription_id = sub_data["stripe_subscription_id"]
            sub.plan = plan
            sub.status = sub_data["status"]
            sub.current_period_start = sub_data["current_period_start"]
            sub.current_period_end = sub_data["current_period_end"]
            sub.cancel_at_period_end = sub_data["cancel_at_period_end"]
        else:
            sub = Subscription(
                user_id=user.id,
                plan=plan,
                status=sub_data["status"],
                stripe_subscription_id=sub_data["stripe_subscription_id"],
                stripe_customer_id=customer_id,
                current_period_start=sub_data["current_period_start"],
                current_period_end=sub_data["current_period_end"],
                cancel_at_period_end=sub_data["cancel_at_period_end"],
            )
            db.add(sub)

        await db.commit()

    return {"received": True}
