import logging

from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
)

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def send_analysis_complete(expo_push_token: str, analysis_id: str, score: int) -> None:
    """Fire-and-forget push notification when analysis completes."""
    if not expo_push_token:
        return

    try:
        response = PushClient().publish(
            PushMessage(
                to=expo_push_token,
                title="Your analysis is ready!",
                body=f"Shot score: {score}/100. Tap to see your coaching tips.",
                data={"analysis_id": analysis_id, "type": "analysis_complete"},
                sound="default",
            )
        )
        response.validate_response()
    except DeviceNotRegisteredError:
        logger.warning("Expo push token %s is no longer registered", expo_push_token)
    except PushServerError as e:
        logger.error("Expo push server error: %s", e)
    except Exception as e:
        logger.error("Unexpected push notification error: %s", e)


def send_analysis_failed(expo_push_token: str, analysis_id: str) -> None:
    if not expo_push_token:
        return

    try:
        PushClient().publish(
            PushMessage(
                to=expo_push_token,
                title="Analysis failed",
                body="Something went wrong processing your video. Please try again.",
                data={"analysis_id": analysis_id, "type": "analysis_failed"},
            )
        )
    except Exception as e:
        logger.error("Unexpected push notification error: %s", e)
