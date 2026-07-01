FROM python:3.12-slim

WORKDIR /app

# Copy only requirements first to leverage Docker layer caching.
# Re-installing dependencies only happens when requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user - principle of least privilege.
RUN useradd --no-create-home --shell /bin/false appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 5000

# eventlet worker is required for Flask-SocketIO long-polling and WebSocket support.
# A single worker is mandatory when using in-memory state (no Redis adapter).
CMD ["gunicorn", "--worker-class", "eventlet", "--workers", "1", "--bind", "0.0.0.0:5000", "main:app"]
