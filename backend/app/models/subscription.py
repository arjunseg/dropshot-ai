from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Plan:
    FREE = "free"
    PRO = "pro"
    COACH = "coach"


class SubscriptionStatus:
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    plan: Mapped[str] = mapped_column(String(20), nullable=False, default=Plan.FREE)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SubscriptionStatus.ACTIVE
    )

    # Stripe references (null for free tier)
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Billing period
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(default=False)

    # Relationship
    user: Mapped["User"] = relationship(back_populates="subscription")  # type: ignore[name-defined]

    @property
    def is_pro(self) -> bool:
        return self.plan in (Plan.PRO, Plan.COACH) and self.status in (
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
        )

    def __repr__(self) -> str:
        return f"<Subscription user_id={self.user_id} plan={self.plan} status={self.status}>"
