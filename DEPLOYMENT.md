# Deployment Guide

This guide covers deploying the Synapse mobile app and backend API to production environments.

## Table of Contents

- [Mobile Deployment](#mobile-deployment)
  - [Prerequisites](#mobile-prerequisites)
  - [EAS Build Setup](#eas-build-setup)
  - [Building for Android](#building-for-android)
  - [Building for iOS](#building-for-ios)
  - [Over-The-Air (OTA) Updates](#over-the-air-ota-updates)
- [Backend Deployment](#backend-deployment)
  - [Prerequisites](#backend-prerequisites)
  - [Docker Deployment](#docker-deployment)
  - [Cloud Deployment](#cloud-deployment)
  - [Database Setup](#database-setup)
  - [Environment Variables](#environment-variables)
- [Production Checklist](#production-checklist)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Mobile Deployment

### Mobile Prerequisites

- **Expo Account**: [Sign up at expo.dev](https://expo.dev)
- **EAS CLI**: Install globally
  ```bash
  npm install -g eas-cli
  ```
- **Platform Accounts**:
  - **Android**: Google Play Console account
  - **iOS**: Apple Developer Program membership (macOS required for builds)

### EAS Build Setup

#### 1. Login to Expo

```bash
cd mobile
eas login
```

#### 2. Configure EAS Project

```bash
eas build:configure
```

This creates `eas.json` in the mobile directory.

#### 3. Configure eas.json

Update `eas.json` with your build profiles:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "API_BASE_URL": "https://api.yourproduction.com"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

#### 4. Update app.json for Production

Ensure your `app.json` has correct metadata:

```json
{
  "expo": {
    "name": "Synapse",
    "slug": "synapse",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.synapse.mobile",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.synapse.mobile",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Building for Android

#### Create Production Build

```bash
cd mobile

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Google Play Store
eas build --platform android --profile production
```

#### Submit to Google Play Store

1. **Manual Upload**:
   - Download the `.aab` file from EAS dashboard
   - Upload to Google Play Console manually

2. **Automated Submit**:
   ```bash
   # First, obtain a Google Service Account JSON key
   # Place it in mobile/google-service-account.json

   eas submit --platform android --profile production
   ```

#### Google Play Console Setup

1. Create app in Google Play Console
2. Complete store listing (screenshots, description, privacy policy)
3. Set up pricing and distribution
4. Upload first release to Internal Testing track
5. Roll out to Production after testing

### Building for iOS

**Note**: iOS builds require an Apple Developer Program membership and macOS for local builds.

#### Create Production Build

```bash
cd mobile

# Build for iOS Simulator (testing)
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

#### Submit to App Store

1. **Manual Upload**:
   - Download the `.ipa` file from EAS dashboard
   - Upload using Transporter app or Xcode

2. **Automated Submit**:
   ```bash
   # Configure with your Apple ID and App Store credentials
   eas submit --platform ios --profile production
   ```

#### App Store Connect Setup

1. Create app in App Store Connect
2. Complete app information and screenshots
3. Set up pricing and availability
4. Upload build via EAS Submit or Transporter
5. Submit for review

### Over-The-Air (OTA) Updates

OTA updates allow you to push JavaScript bundle updates without going through app stores.

#### Configure Updates

Add to `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

#### Publish Update

```bash
cd mobile

# Publish to production channel
eas update --branch production --message "Fix authentication bug"

# Publish to specific channel
eas update --branch staging --message "Test new features"
```

#### Update Channels

- **production**: Live app users
- **staging**: Internal testing
- **preview**: Development previews

#### OTA Best Practices

1. **Test thoroughly**: Always test on staging before production
2. **Gradual rollout**: Use EAS Update channels for gradual deployment
3. **Version compatibility**: Ensure updates are compatible with native code
4. **Rollback plan**: Keep previous updates available for rollback

---

## Backend Deployment

### Backend Prerequisites

- **Docker**: Installed on deployment server
- **Domain**: Domain name with DNS configured
- **SSL Certificate**: Let's Encrypt or other SSL provider
- **Database**: PostgreSQL 14+ with pgvector extension
- **Cache**: Redis 7+
- **Reverse Proxy**: Nginx or Caddy (recommended)

### Docker Deployment

#### 1. Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
services:
  db:
    image: ankane/pgvector:latest
    container_name: synapse-db-prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - synapse-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: synapse-redis-prod
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - synapse-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: synapse-api:latest
    container_name: synapse-api-prod
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      ENVIRONMENT: production
      DEBUG: "false"
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      EMBEDDING_MODEL: intfloat/multilingual-e5-large
      EMBEDDING_DEVICE: ${EMBEDDING_DEVICE:-cpu}
      LOG_LEVEL: INFO
      LOG_FORMAT: json
      CORS_ORIGINS: ${CORS_ORIGINS}
    volumes:
      - model_cache:/home/synapse/.cache
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - synapse-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: synapse-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot
    depends_on:
      - api
    networks:
      - synapse-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  model_cache:
    driver: local
  certbot_data:
    driver: local

networks:
  synapse-network:
    driver: bridge
```

#### 2. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        listen 80;
        server_name api.yourdomain.com;

        # Redirect HTTP to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }

        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy Settings
        location / {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint (no rate limit)
        location /health {
            proxy_pass http://api/health;
            access_log off;
        }
    }
}
```

#### 3. Deploy with Docker Compose

```bash
cd backend

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Cloud Deployment

#### AWS Deployment

**Architecture**:
- **Compute**: ECS Fargate or EC2 with Docker
- **Database**: RDS PostgreSQL with pgvector
- **Cache**: ElastiCache Redis
- **Storage**: S3 for model cache and backups
- **Load Balancer**: Application Load Balancer (ALB)
- **DNS**: Route 53

**Setup Steps**:

1. **Create RDS PostgreSQL Instance**:
   ```bash
   # Install pgvector extension after instance creation
   psql -h your-rds-endpoint -U postgres
   CREATE EXTENSION vector;
   ```

2. **Create ElastiCache Redis Cluster**:
   - Choose Redis 7.x
   - Enable encryption in transit
   - Configure security groups

3. **Deploy on ECS Fargate**:
   ```bash
   # Build and push Docker image to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   docker build -t synapse-api .
   docker tag synapse-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/synapse-api:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/synapse-api:latest

   # Create ECS task definition and service
   aws ecs create-service --cluster synapse-cluster --service-name synapse-api --task-definition synapse-api:1 --desired-count 2
   ```

4. **Configure ALB**:
   - Create target group for ECS service
   - Add SSL certificate from ACM
   - Configure health check to `/health`

#### GCP Deployment

**Architecture**:
- **Compute**: Cloud Run or GKE
- **Database**: Cloud SQL PostgreSQL
- **Cache**: Memorystore Redis
- **Storage**: Cloud Storage for model cache
- **Load Balancer**: Cloud Load Balancing

**Setup Steps**:

1. **Create Cloud SQL Instance**:
   ```bash
   gcloud sql instances create synapse-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1

   # Enable pgvector
   gcloud sql connect synapse-db --user=postgres
   CREATE EXTENSION vector;
   ```

2. **Deploy on Cloud Run**:
   ```bash
   # Build and push to Artifact Registry
   gcloud builds submit --tag gcr.io/PROJECT-ID/synapse-api

   # Deploy to Cloud Run
   gcloud run deploy synapse-api \
     --image gcr.io/PROJECT-ID/synapse-api \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL=postgresql://user:pass@/db?host=/cloudsql/PROJECT-ID:us-central1:synapse-db
   ```

#### Azure Deployment

**Architecture**:
- **Compute**: Azure Container Instances or AKS
- **Database**: Azure Database for PostgreSQL
- **Cache**: Azure Cache for Redis
- **Storage**: Azure Blob Storage
- **Load Balancer**: Azure Application Gateway

### Database Setup

#### PostgreSQL with pgvector

1. **Install pgvector Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run Alembic Migrations**:
   ```bash
   # Inside the API container or on server
   cd /app
   alembic upgrade head
   ```

3. **Verify Migration**:
   ```sql
   -- Check tables exist
   \dt

   -- Verify pgvector column
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'notes' AND column_name = 'embedding';
   ```

#### Database Backups

**Automated Backups** (PostgreSQL):
```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h db -U synapse synapse | gzip > $BACKUP_DIR/synapse_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "synapse_*.sql.gz" -mtime +7 -delete
```

**Cron Job**:
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### Environment Variables

#### Production .env Template

```bash
# Application
VERSION=1.0.0
ENVIRONMENT=production
DEBUG=false

# API
API_HOST=0.0.0.0
API_PORT=8000

# CORS - Add your production mobile app domains
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Database - Use production credentials
DATABASE_URL=postgresql://user:password@db-host:5432/synapse
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# Redis - Use production credentials
REDIS_URL=redis://:password@redis-host:6379/0
REDIS_CACHE_TTL=3600

# JWT - CRITICAL: Generate secure secret
# Generate with: openssl rand -hex 32
JWT_SECRET_KEY=<REPLACE_WITH_SECURE_RANDOM_STRING>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI Models
EMBEDDING_MODEL=intfloat/multilingual-e5-large
EMBEDDING_DEVICE=cpu  # Use 'cuda' if GPU available
EMBEDDING_BATCH_SIZE=32

# Recommendation
RECOMMENDATION_TOP_K=10
RECOMMENDATION_MIN_SCORE=0.3

# Sync
SYNC_BATCH_MAX_SIZE=100
SYNC_BATCH_MAX_BYTES=1048576

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# PostgreSQL (for docker-compose)
POSTGRES_DB=synapse
POSTGRES_USER=synapse
POSTGRES_PASSWORD=<REPLACE_WITH_SECURE_PASSWORD>

# Redis (for docker-compose)
REDIS_PASSWORD=<REPLACE_WITH_SECURE_PASSWORD>
```

**Security Notes**:
- Never commit `.env` to version control
- Use environment-specific secrets management
- Rotate JWT secret periodically
- Use strong database passwords

---

## Production Checklist

### Pre-Deployment

- [ ] Update version numbers in `app.json` (mobile) and `config.py` (backend)
- [ ] Generate secure JWT secret key (`openssl rand -hex 32`)
- [ ] Configure production database credentials
- [ ] Set up SSL certificates (Let's Encrypt or commercial)
- [ ] Configure CORS origins for production domains
- [ ] Set `DEBUG=false` and `ENVIRONMENT=production`
- [ ] Review and update privacy policy URL
- [ ] Prepare app store assets (screenshots, descriptions)

### Mobile App

- [ ] Test production build on physical devices
- [ ] Verify API connectivity from mobile app
- [ ] Test OTA update mechanism
- [ ] Configure app store metadata
- [ ] Set up crash reporting (Sentry, Bugsnag)
- [ ] Configure analytics (if applicable)
- [ ] Review and accept app store guidelines

### Backend API

- [ ] Run all tests (`pytest --cov=app`)
- [ ] Verify database migrations (`alembic upgrade head`)
- [ ] Test health check endpoints
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation (CloudWatch, Stackdriver, ELK)
- [ ] Configure backup automation
- [ ] Test disaster recovery procedures
- [ ] Review security scan results (Trivy)

### Infrastructure

- [ ] Configure auto-scaling (if applicable)
- [ ] Set up load balancer health checks
- [ ] Configure DDoS protection
- [ ] Set up CDN (if serving static assets)
- [ ] Configure monitoring dashboards
- [ ] Set up alerting rules
- [ ] Document runbook for common issues
- [ ] Test backup restoration

---

## Monitoring and Maintenance

### Application Monitoring

**Health Checks**:
```bash
# API health check
curl https://api.yourdomain.com/health

# Expected response
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

**Metrics to Monitor**:
- API response times (P50, P95, P99)
- Error rates (4xx, 5xx)
- Database connection pool usage
- Redis memory usage
- Disk space (database and logs)
- Container CPU and memory usage

**Recommended Tools**:
- **Application Performance**: Datadog, New Relic, AppDynamics
- **Logs**: ELK Stack, Splunk, CloudWatch Logs
- **Uptime**: UptimeRobot, Pingdom, StatusCake
- **Error Tracking**: Sentry, Rollbar, Bugsnag

### Log Management

**Centralized Logging**:
```bash
# View API logs
docker-compose logs -f api --tail=100

# Filter errors
docker-compose logs api | grep ERROR

# Export logs
docker-compose logs --no-color api > api-logs.txt
```

### Database Maintenance

**Regular Tasks**:
```sql
-- Vacuum database (weekly)
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%';

-- Monitor table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Troubleshooting

### Common Issues

#### API Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check database connection
docker-compose exec api python -c "from app.database import check_db_connection; print(check_db_connection())"

# Verify environment variables
docker-compose exec api env | grep DATABASE_URL
```

#### Database Connection Timeout

```bash
# Check PostgreSQL is running
docker-compose ps db

# Test connection from API container
docker-compose exec api psql $DATABASE_URL

# Increase connection timeout in config.py
DB_POOL_TIMEOUT = 30  # seconds
```

#### OOM (Out of Memory) Errors

```bash
# Check container memory usage
docker stats

# Reduce batch size for embeddings
EMBEDDING_BATCH_SIZE=16  # default: 32

# Increase container memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G
```

#### Slow AI Model Loading

```bash
# Pre-download model during build
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-large')"

# Or mount model cache volume
volumes:
  - model_cache:/home/synapse/.cache
```

### Performance Optimization

**Database**:
- Create indexes on frequently queried columns
- Use connection pooling (already configured)
- Enable query caching in PostgreSQL
- Consider read replicas for high traffic

**API**:
- Enable Redis caching for recommendations
- Use CDN for static assets
- Implement request rate limiting
- Enable gzip compression

**Mobile**:
- Optimize image assets
- Implement code splitting
- Use lazy loading for screens
- Enable Hermes JavaScript engine

---

## Support and Resources

- **Docker Documentation**: https://docs.docker.com
- **Expo EAS Documentation**: https://docs.expo.dev/eas
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment
- **PostgreSQL pgvector**: https://github.com/pgvector/pgvector
- **Let's Encrypt**: https://letsencrypt.org

For project-specific issues, refer to the main [README.md](README.md) or open an issue on GitHub.
