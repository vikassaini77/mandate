.PHONY: dev test lint seed train eval redteam

dev:
	docker-compose -f infrastructure/docker/docker-compose.yml up --build

test:
	uv run pytest tests/ -v

lint:
	uv run ruff check apps/api/src/ packages/ tests/ scripts/
	uv run mypy apps/api/src/ packages/

seed:
	uv run python scripts/redteam/seed.py

train:
	uv run python scripts/redteam/train_models.py

eval:
	uv run python scripts/redteam/eval_models.py

redteam:
	uv run python scripts/redteam/run_redteam.py
