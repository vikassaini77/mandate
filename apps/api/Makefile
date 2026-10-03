.PHONY: dev test lint seed train eval redteam

dev:
	docker-compose up --build

test:
	uv run pytest tests/ -v

lint:
	uv run ruff check app/ tests/ scripts/
	uv run mypy app/

seed:
	uv run python scripts/seed.py

train:
	uv run python scripts/train_models.py

eval:
	uv run python scripts/eval_models.py

redteam:
	uv run python scripts/run_redteam.py
