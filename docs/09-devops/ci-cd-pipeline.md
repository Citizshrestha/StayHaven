# CI/CD Pipeline

> Continuous Integration and Continuous Deployment strategy for StayHaven

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Build Process](#build-process)
5. [Deployment Strategy](#deployment-strategy)
6. [Environment Management](#environment-management)

---

## 🎯 Overview

### CI/CD Goals

```
Automation Goals:
├── ✅ Automated testing on every commit
├── ✅ Code quality checks (linting, formatting)
├── ✅ Security vulnerability scanning
├── ✅ Automated builds
├── ✅ Automated deployment to staging
└── ✅ Manual approval for production
```

### Pipeline Flow

```
Developer Push
       ↓
┌──────────────────┐
│   Code Quality   │  → ESLint, Prettier
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Run Tests      │  → Unit, Integration, E2E
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Build          │  → Backend & Frontend
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Deploy Staging │  → Automatic
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Deploy Production│  → Manual Approval
└──────────────────┘
```

---

## 🏗️ Pipeline Architecture

### Multi-Stage Pipeline

```yaml
stages:
  - lint          # Code quality checks
  - test          # Run all tests
  - build         # Build applications
  - deploy-dev    # Deploy to development
  - deploy-staging # Deploy to staging
  - deploy-prod   # Deploy to production (manual)
```

---

## 🔄 GitHub Actions Workflows

### 1. Main CI/CD Workflow

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'

jobs:
  # ==================== LINT STAGE ====================
  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies (Backend)
        working-directory: ./Backend
        run: npm ci
      
      - name: Install dependencies (Frontend)
        working-directory: ./frontend
        run: npm ci
      
      - name: Lint Backend
        working-directory: ./Backend
        run: npm run lint
      
      - name: Lint Frontend
        working-directory: ./frontend
        run: npm run lint
  
  # ==================== TEST STAGE ====================
  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    needs: lint
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand({ ping: 1 })'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: Backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./Backend
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./Backend
        run: npm run test:unit
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_ACCESS_SECRET: test_secret
          JWT_REFRESH_SECRET: test_refresh_secret
      
      - name: Run integration tests
        working-directory: ./Backend
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_ACCESS_SECRET: test_secret
      
      - name: Generate coverage report
        working-directory: ./Backend
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./Backend/coverage/lcov.info
          flags: backend
          name: backend-coverage
  
  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    needs: lint
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run tests
        working-directory: ./frontend
        run: npm test
      
      - name: Generate coverage
        working-directory: ./frontend
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage
  
  # ==================== BUILD STAGE ====================
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Build Backend
        working-directory: ./Backend
        run: |
          npm ci
          npm run build
      
      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
      
      - name: Upload Backend Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: backend-build
          path: Backend/
          retention-days: 5
      
      - name: Upload Frontend Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist/
          retention-days: 5
  
  # ==================== SECURITY SCAN ====================
  security-scan:
    name: Security Vulnerability Scan
    runs-on: ubuntu-latest
    needs: lint
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit (Backend)
        working-directory: ./Backend
        run: npm audit --audit-level=high
        continue-on-error: true
      
      - name: Run npm audit (Frontend)
        working-directory: ./frontend
        run: npm audit --audit-level=high
        continue-on-error: true
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --all-projects --severity-threshold=high
  
  # ==================== DEPLOY STAGING ====================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, security-scan]
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.stayhaven.com
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Backend Artifacts
        uses: actions/download-artifact@v3
        with:
          name: backend-build
          path: Backend/
      
      - name: Download Frontend Artifacts
        uses: actions/download-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist/
      
      - name: Deploy Backend to Staging
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /var/www/stayhaven-staging/backend
            git pull origin develop
            npm ci --production
            pm2 restart stayhaven-staging-api
      
      - name: Deploy Frontend to Staging
        run: |
          aws s3 sync frontend/dist/ s3://stayhaven-staging-frontend/ --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.STAGING_CF_DIST_ID }} --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
  
  # ==================== DEPLOY PRODUCTION ====================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://stayhaven.com
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Artifacts
        uses: actions/download-artifact@v3
      
      - name: Deploy Backend to Production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/stayhaven/backend
            git pull origin main
            npm ci --production
            pm2 restart stayhaven-api
      
      - name: Deploy Frontend to Production
        run: |
          aws s3 sync frontend/dist/ s3://stayhaven-production-frontend/ --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.PROD_CF_DIST_ID }} --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release ${{ github.run_number }}
          draft: false
          prerelease: false
```

---

### 2. Pull Request Workflow

**File**: `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  pr-validation:
    name: PR Validation
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Check PR title
        run: |
          if ! echo "${{ github.event.pull_request.title }}" | grep -qE "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+"; then
            echo "PR title must follow conventional commits format"
            exit 1
          fi
      
      - name: Check for merge conflicts
        run: |
          git fetch origin ${{ github.base_ref }}
          if git merge-tree $(git merge-base HEAD origin/${{ github.base_ref }}) HEAD origin/${{ github.base_ref }} | grep -q '<<<<<<<'; then
            echo "Merge conflicts detected"
            exit 1
          fi
      
      - name: Lint commit messages
        uses: wagoid/commitlint-github-action@v5
```

---

### 3. Dependency Update Workflow

**File**: `.github/workflows/dependency-update.yml`

```yaml
name: Dependency Update

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
  workflow_dispatch:

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Update Backend Dependencies
        working-directory: ./Backend
        run: |
          npm outdated
          npm update
          npm audit fix
      
      - name: Update Frontend Dependencies
        working-directory: ./frontend
        run: |
          npm outdated
          npm update
          npm audit fix
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'chore: update dependencies'
          title: 'chore: Weekly dependency update'
          body: 'Automated dependency updates'
          branch: chore/dependency-update
```

---

## 🔧 Build Process

### Backend Build

```json
{
  "scripts": {
    "build": "echo 'No build step needed for Node.js'",
    "prebuild": "npm run lint",
    "postbuild": "npm test"
  }
}
```

### Frontend Build

```json
{
  "scripts": {
    "build": "vite build",
    "prebuild": "npm run lint",
    "build:analyze": "vite build --mode analyze"
  }
}
```

---

## 🚀 Deployment Strategy

### Blue-Green Deployment

```yaml
# Deploy new version (green)
- name: Deploy Green Environment
  run: |
    pm2 start server.js --name stayhaven-api-green
    
# Health check
- name: Health Check
  run: curl -f http://localhost:5001/health

# Switch traffic
- name: Switch to Green
  run: |
    pm2 stop stayhaven-api-blue
    pm2 restart stayhaven-api-green as stayhaven-api
```

### Rolling Deployment

```yaml
# Deploy to servers one by one
- name: Deploy to Server 1
  run: deploy-script.sh server1
  
- name: Wait for health check
  run: sleep 30

- name: Deploy to Server 2
  run: deploy-script.sh server2
```

---

## 🌍 Environment Management

### Environment Secrets

```yaml
# GitHub Repository Secrets
- STAGING_HOST
- STAGING_USER
- STAGING_SSH_KEY
- PROD_HOST
- PROD_USER
- PROD_SSH_KEY
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- MONGODB_URI_STAGING
- MONGODB_URI_PRODUCTION
- JWT_SECRET_STAGING
- JWT_SECRET_PRODUCTION
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- SNYK_TOKEN
```

### Environment Variables

```bash
# Staging
export NODE_ENV=staging
export PORT=5000
export MONGODB_URI=${{ secrets.MONGODB_URI_STAGING }}
export FRONTEND_URL=https://staging.stayhaven.com

# Production
export NODE_ENV=production
export PORT=5000
export MONGODB_URI=${{ secrets.MONGODB_URI_PRODUCTION }}
export FRONTEND_URL=https://stayhaven.com
```

---

## 📊 Monitoring & Notifications

### Slack Notifications

```yaml
- name: Notify Slack on Success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '✅ Deployment to ${{ github.ref }} successful!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}

- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '❌ Deployment to ${{ github.ref }} failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📌 Summary

CI/CD in StayHaven:
- **Automated Testing**: Every commit
- **Code Quality**: Linting + formatting
- **Security**: Vulnerability scanning
- **Staging**: Auto-deploy on develop
- **Production**: Manual approval
- **Monitoring**: Slack notifications

**Goal**: Fast, reliable, automated deployments.