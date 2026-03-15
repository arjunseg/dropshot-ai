"""
FastAPI dependency injection functions.

Critical business logic lives here:
- Auth: extract user from JWT
- Usage enforcement: free tier 3 analyses/month limit
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.analysis import Analysis, AnalysisStatus
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.user import User
from app.services.auth_service import decode_token

settings = get_settings()
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT, return the User ORM object."""
    try:
        user_id = decode_token(credentials.credentials, expected_type="access")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.subscription))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


async def get_current_user_with_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Same as get_current_user but ensures subscription is loaded."""
    if user.subscription is None:
        # Create default free subscription if none exists
        sub = Subscription(user_id=user.id, plan=Plan.FREE, status=SubscriptionStatus.ACTIVE)
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        user.subscription = sub
    return user


async def check_analysis_limit(
    user: User = Depends(get_current_user_with_subscription),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Enforce the free tier monthly analysis limit.

    Free users: max 3 analyses per calendar month.
    Pro/Coach users: unlimited.

    Raises HTTP 402 with upgrade_required=True if limit exceeded.
    """
    sub = user.subscription

    # Pro users are not limited
    if sub and sub.is_pro:
        return user

    # Count analyses created this calendar month
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(func.count(Analysis.id))
        .where(
            Analysis.user_id == user.id,
            Analysis.created_at >= month_start,
            Analysis.status != AnalysisStatus.FAILED,
        )
    )
    count = result.scalar_one()

    if count >= settings.free_tier_monthly_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "upgrade_required": True,
                "analyses_used": count,
                "monthly_limit": settings.free_tier_monthly_limit,
                "message": f"Free tier limit of {settings.free_tier_monthly_limit} analyses/month reached. Upgrade to Pro for unlimited analyses.",
            },
        )

    return user


async def require_pro(
    user: User = Depends(get_current_user_with_subscription),
) -> User:
    """Require Pro subscription for certain features."""
    if not (user.subscription and user.subscription.is_pro):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"upgrade_required": True, "message": "This feature requires a Pro subscription."},
        )
    return user
