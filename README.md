# AuctionOS - Real Estate Management System

## Overview

AuctionOS is a comprehensive, production-ready real estate management system designed to streamline the acquisition, analysis, and management of auction properties. It integrates web scraping, automated valuation, and robust workflow management into a single platform.

## Key Features

### 🏡 Property Management

- **Central Inventory**: Track Active, Pending, Sold, and Draft properties.
- **Smart Tags**: Auto-generated unique identifiers based on FIPS state/county codes (e.g., `01001-ST011-00003`).
- **Geocoding & Maps**: Interactive maps with property pins and auto-fill address coordinates.
- **Media Management**: Upload and view photo galleries for each property.

### 💰 Financial Intelligence

- **Valuation Analysis**: Compare Opening Bids vs. Assessed Value.
- **Expense Tracking**: Log Rehab, Tax, and Utility expenses to calculate true Net Profit.
- **ROI Dashboard**: Real-time visualization of Total Equity, Capital Invested, and ROI.

### 🤖 Automation & Intelligence

- **Web Scraping**: Automated ingestion of auction data via Playwright (Headless Browser).
- **CSV Import**: Bulk upload capability with robust regex parsing for raw text.
- **Smart Enrichment**: Auto-population of legal descriptions, zoning, and flood zone data.

### 📝 Workflow & Collaboration

- **Wizard Interface**: Step-by-step Property Creation/Editing wizard.
- **Draft Mode**: Staging area for incomplete listings.
- **Notes System**: Team collaboration with timestamped user comments.
- **Reporting**: Generate PDF summaries for individual properties or aggregate inventory reports.

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Alembic, Celery, Redis.
- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Database**: MySQL 8.0.
- **Infrastructure**: Docker, Docker Compose, Railway (Production Ready).

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Git

### Quick Start (Local)

1. **Clone the Repository**

   ```bash
   git clone <repo-url>
   cd auctionos
   ```

2. **Start Services**

   ```bash
   docker-compose up -d --build
   ```

3. **Access the Application**
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Default Credentials

- **Admin**: `admin@auctionpro.com` / `password`

---

## 🛠 Deployment (Railway)

The system is configured for seamless deployment on Railway.

1. **Environment Variables**:
   Ensure the following variables are set in your production environment:
   - `DATABASE_URL`: Connection string for MySQL.
   - `REDIS_URL`: Connection string for Redis.
   - `SECRET_KEY`: For JWT generation.
   - `VITE_API_URL`: URL of the deployed backend (e.g., `https://backend-production.up.railway.app/api/v1`).

2. **Startup Command**:
   The backend `Dockerfile` uses `start.sh` to automatically:
   - Run Database Migrations (`alembic upgrade head`).
   - Create the default Admin user if missing.
   - Start the Uvicorn server.

---

## 📂 Project Structure

```text
auctionos/
├── backend/            # FastAPI Application
│   ├── app/
│   │   ├── api/        # Routes & Endpoints
│   │   ├── models/     # SQLAlchemy Database Models
│   │   ├── schemas/    # Pydantic Schemas
│   │   ├── services/   # Business Logic (Scraper, Importer, SmartTag)
│   └── scripts/        # Utility scripts (ensure_admin.py)
├── frontend/           # React Application
│   ├── components/     # Reusable UI Components
│   ├── pages/          # Application Pages (Dashboard, Inventory, Wizard)
│   └── services/       # API Client
└── docker-compose.yml  # Local Development Orchestration
```

## 🧪 Verification & Testing

To run backend tests inside the container:

```bash
docker-compose exec backend pytest
```

## 📜 Documentation

- **Walkthrough**: See `walkthrough.md` for a detailed log of implemented features and verification steps.
- **API Docs**: Auto-generated Swagger UI at `/docs`.
