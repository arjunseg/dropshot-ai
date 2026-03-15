from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # DUPR skill rating, e.g. 3.5
    skill_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    # Expo push token for notifications
    expo_push_token: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user", lazy="noload")  # type: ignore[name-defined]
    subscription: Mapped["Subscription | None"] = relationship(back_populates="user", uselist=False, lazy="noload")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
