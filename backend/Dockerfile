FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install poetry==1.8.3

ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

COPY pyproject.toml poetry.lock* ./
# API image: skip heavy ML dependencies (worker has them)
RUN poetry install --no-root --without dev --extras "" 2>/dev/null || \
    pip install fastapi uvicorn[standard] pydantic pydantic-settings \
    sqlalchemy asyncpg alembic redis celery boto3 anthropic stripe \
    passlib python-jose python-multipart httpx exponent-server-sdk

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
