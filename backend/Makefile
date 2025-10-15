.PHONY: help install dev test lint format clean docker-up docker-down docker-logs db-upgrade db-downgrade

help:
	@echo "Synapse Backend - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Run development server"
	@echo "  make test          - Run tests"
	@echo "  make test-cov      - Run tests with coverage"
	@echo "  make lint          - Run linters (ruff)"
	@echo "  make format        - Format code (black)"
	@echo "  make type-check    - Run type checker (mypy)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up     - Start all Docker services"
	@echo "  make docker-down   - Stop all Docker services"
	@echo "  make docker-logs   - View Docker logs"
	@echo "  make docker-build  - Rebuild Docker images"
	@echo ""
	@echo "Database:"
	@echo "  make db-upgrade    - Apply database migrations"
	@echo "  make db-downgrade  - Rollback last migration"
	@echo "  make db-revision   - Create new migration"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove cache and build files"

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

lint:
	ruff check app tests

format:
	black app tests
	ruff check --fix app tests

type-check:
	mypy app

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build --no-cache

db-upgrade:
	alembic upgrade head

db-downgrade:
	alembic downgrade -1

db-revision:
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .mypy_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +
	rm -rf htmlcov .coverage
