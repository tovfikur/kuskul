FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app

EXPOSE 8000

ENV PYTHONPATH=/app
CMD ["sh", "-c", "python -m alembic upgrade head && python app/scripts/seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

