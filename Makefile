.PHONY: dev dev-docker test test-policy lint seed train eval redteam

dev:
	./dev.sh || dev.bat

dev-docker:
	docker compose up --build

test:
	uv run --project apps/api --extra dev pytest tests/ -v

test-policy:
	uv run --project apps/api --extra dev pytest tests/unit/test_policy.py -v

lint:
	uv run ruff check apps/api/src/ packages/ tests/ scripts/

seed:
	uv run python scripts/redteam/seed.py

train:
	uv run python scripts/redteam/train_models.py

eval:
	uv run python scripts/redteam/eval_models.py

redteam:
	uv run python scripts/redteam/run_redteam.py
