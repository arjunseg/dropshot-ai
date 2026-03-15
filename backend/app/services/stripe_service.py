from datetime import UTC, datetime

import stripe

from app.config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def get_or_create_customer(user_id: str, email: str) -> str:
    """Return existing Stripe customer ID or create a new one."""
    customers = stripe.Customer.list(email=email, limit=1)
    if customers.data:
        return str(customers.data[0].id)

    customer = stripe.Customer.create(
        email=email,
        metadata={"dropshot_user_id": user_id},
    )
    return str(customer.id)


def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    user_id: str,
) -> tuple[str, str]:
    """Returns (checkout_url, session_id)."""
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"dropshot_user_id": user_id},
        subscription_data={"metadata": {"dropshot_user_id": user_id}},
    )
    return str(session.url), str(session.id)


def create_portal_session(customer_id: str, return_url: str) -> str:
    """Returns portal URL for managing subscriptions."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return str(session.url)


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )


def parse_subscription_from_event(event: stripe.Event) -> dict:
    """Extract normalized subscription fields from a Stripe webhook event."""
    sub = event.data.object
    return {
        "stripe_subscription_id": sub.id,
        "stripe_customer_id": sub.customer,
        "status": sub.status,
        "current_period_start": datetime.fromtimestamp(sub.current_period_start, tz=UTC),
        "current_period_end": datetime.fromtimestamp(sub.current_period_end, tz=UTC),
        "cancel_at_period_end": sub.cancel_at_period_end,
        "price_id": sub.items.data[0].price.id if sub.items.data else None,
    }
