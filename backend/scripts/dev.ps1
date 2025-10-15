# PowerShell script for Windows development

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Synapse Backend - Available Commands" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Development:" -ForegroundColor Yellow
    Write-Host "  .\scripts\dev.ps1 install       - Install dependencies"
    Write-Host "  .\scripts\dev.ps1 dev           - Run development server"
    Write-Host "  .\scripts\dev.ps1 test          - Run tests"
    Write-Host "  .\scripts\dev.ps1 test-cov      - Run tests with coverage"
    Write-Host "  .\scripts\dev.ps1 lint          - Run linters"
    Write-Host "  .\scripts\dev.ps1 format        - Format code"
    Write-Host ""
    Write-Host "Docker:" -ForegroundColor Yellow
    Write-Host "  .\scripts\dev.ps1 docker-up     - Start all Docker services"
    Write-Host "  .\scripts\dev.ps1 docker-down   - Stop all Docker services"
    Write-Host "  .\scripts\dev.ps1 docker-logs   - View Docker logs"
    Write-Host ""
    Write-Host "Database:" -ForegroundColor Yellow
    Write-Host "  .\scripts\dev.ps1 db-upgrade    - Apply migrations"
    Write-Host "  .\scripts\dev.ps1 db-downgrade  - Rollback migration"
    Write-Host ""
    Write-Host "Cleanup:" -ForegroundColor Yellow
    Write-Host "  .\scripts\dev.ps1 clean         - Remove cache files"
}

function Install-Dependencies {
    Write-Host "Installing dependencies..." -ForegroundColor Green
    pip install -r requirements.txt
}

function Start-Dev {
    Write-Host "Starting development server..." -ForegroundColor Green
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Green
    pytest
}

function Run-TestsCoverage {
    Write-Host "Running tests with coverage..." -ForegroundColor Green
    pytest --cov=app --cov-report=html --cov-report=term
}

function Run-Lint {
    Write-Host "Running linters..." -ForegroundColor Green
    ruff check app tests
}

function Run-Format {
    Write-Host "Formatting code..." -ForegroundColor Green
    black app tests
    ruff check --fix app tests
}

function Docker-Up {
    Write-Host "Starting Docker services..." -ForegroundColor Green
    docker-compose up -d
}

function Docker-Down {
    Write-Host "Stopping Docker services..." -ForegroundColor Green
    docker-compose down
}

function Docker-Logs {
    Write-Host "Showing Docker logs..." -ForegroundColor Green
    docker-compose logs -f
}

function DB-Upgrade {
    Write-Host "Applying database migrations..." -ForegroundColor Green
    alembic upgrade head
}

function DB-Downgrade {
    Write-Host "Rolling back last migration..." -ForegroundColor Green
    alembic downgrade -1
}

function Clean-Cache {
    Write-Host "Cleaning cache files..." -ForegroundColor Green
    Get-ChildItem -Path . -Include __pycache__,*.pyc,.pytest_cache,.mypy_cache,.ruff_cache -Recurse -Force | Remove-Item -Force -Recurse
    if (Test-Path htmlcov) { Remove-Item htmlcov -Recurse -Force }
    if (Test-Path .coverage) { Remove-Item .coverage -Force }
}

# Execute command
switch ($Command) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "dev" { Start-Dev }
    "test" { Run-Tests }
    "test-cov" { Run-TestsCoverage }
    "lint" { Run-Lint }
    "format" { Run-Format }
    "docker-up" { Docker-Up }
    "docker-down" { Docker-Down }
    "docker-logs" { Docker-Logs }
    "db-upgrade" { DB-Upgrade }
    "db-downgrade" { DB-Downgrade }
    "clean" { Clean-Cache }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
    }
}
