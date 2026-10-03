FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy dependency files
COPY pyproject.toml .

# Install dependencies (system-wide for docker)
RUN uv pip install --system -e .

# Copy application code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1

# Expose port (Render sets this dynamically, but 8000 is default)
EXPOSE 8000

# The command is provided in docker-compose or render.yaml, 
# but providing a default one here
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
