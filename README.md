# Survey Analytics Dashboard + AI Agent

A comprehensive survey feedback analysis system with an AI-powered agent for interpreting customer comments, dashboards for viewing metrics, and automated alerting for critical issues.

## Features

- 📊 **Dashboard**: View survey summaries, KPIs, sentiment distribution, and response trends
- 🤖 **AI Agent**: Chat interface to ask questions about survey feedback
- 📈 **Sentiment Analysis**: LLM-powered analysis of comments with topic extraction
- 🚨 **Alerts**: Automatic flagging of critical feedback
- 📁 **CSV Import**: Upload Adobe Campaign survey data in CSV format
- 🎯 **Topics & Themes**: Automatic extraction of key themes from comments

## Architecture

```
Adobe Campaign CSV → Backend API → PostgreSQL Database
                        ↓
                  Sentiment Analysis (LLM)
                        ↓
              Frontend Dashboard + AI Agent
```

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4o
- **Deployment**: Cloud-ready (AWS/Azure/GCP)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- OpenAI API key
- Docker (optional, for local PostgreSQL)

### 1. Database Setup

Start PostgreSQL (using Docker):
```bash
docker-compose up -d postgres
```

Or connect to your existing PostgreSQL instance and update `.env`.

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your OpenAI API key
# OPENAI_API_KEY=your_key_here

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Start dev server
npm run dev
```

Frontend will run on `http://localhost:3000`

## Usage

### 1. Upload Survey Data

Create a CSV file with the following columns:
```
runId,uniqueId,q1,q2,q3,...,q10
survey-001,cust-123,8,Good product quality,,,
survey-001,cust-124,5,Average experience,,,
```

Upload via:
- API endpoint: `POST /api/upload` (form-data with CSV file)
- Or drop in `backend/uploads` folder

### 2. View Dashboard

1. Open `http://localhost:3000`
2. See all survey runs
3. Click on a survey to view:
   - KPI cards (responses, avg rating, sentiment %)
   - Charts (sentiment distribution, top topics)
   - Response table with filtering
   - Critical alerts

### 3. Use AI Agent

From survey detail page, click "Ask Agent" to:
- Ask: "What are the top complaints?"
- Ask: "Show me all negative feedback"
- Ask: "What are the most common themes?"

Agent analyzes stored responses and provides insights.

## API Endpoints

### Surveys
- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:runId/summary` - Get survey KPIs and summary
- `GET /api/surveys/:runId/responses` - Get paginated responses
- `GET /api/surveys/:runId/topics` - Get topic breakdown

### Alerts
- `GET /api/alerts` - Get unresolved alerts
- `PUT /api/alerts/:alertId/resolve` - Mark alert as resolved

### Agent
- `POST /api/agent/ask` - Ask AI agent a question

### Files
- `POST /api/upload` - Upload CSV file

## CSV Format

Required columns:
- `runId`: Survey run identifier (e.g., "survey-2026-06")
- `uniqueId`: Customer identifier (e.g., "cust-123")
- `q1`: Rating 1-10 (required)
- `q2`: Comment text (required, sentiment analysis is performed on this)
- `q3-q10`: Additional optional response fields

## Configuration

### Backend (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=survey_analytics
DB_USER=postgres
DB_PASSWORD=postgres

PORT=3001
NODE_ENV=development

OPENAI_API_KEY=sk-...
CSV_UPLOAD_PATH=./uploads
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:3001
VITE_ENVIRONMENT=development
```

## Deployment

### Using Cloud Services

**AWS:**
- RDS PostgreSQL for database
- Lambda + API Gateway for backend API
- S3 for CSV uploads
- CloudFront + S3 for frontend

**Azure:**
- Azure Database for PostgreSQL
- App Service for backend
- Blob Storage for uploads
- Static Web Apps for frontend

**Google Cloud:**
- Cloud SQL PostgreSQL
- Cloud Run for backend
- Cloud Storage for uploads
- Firebase Hosting for frontend

### Render Deployment

This repo includes `render.yaml` for Render auto-deploy.

- Backend service: `survey-analytics-backend`
  - `rootDir: backend`
  - `buildCommand: npm install && npm run build`
  - `startCommand: npm start`
  - env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`, `CSV_UPLOAD_PATH`

- Frontend service: `survey-analytics-frontend`
  - `rootDir: frontend`
  - `buildCommand: npm install && npm run build`
  - `publishPath: dist`
  - env var: `VITE_API_URL`

- Database: `survey-analytics-db` (Postgres 15)

#### Recommended Render settings

- Use the same branch for both services
- Set `VITE_API_URL` to the backend public URL
- Keep `CSV_UPLOAD_PATH=./uploads`
- Use Render-managed Postgres to populate backend env vars automatically

## Performance Optimization

- Responses are paginated (20 per page)
- Sentiment analysis runs in batches (configurable interval)
- CSV parsing is streaming-friendly
- Frontend uses React lazy loading

## Security

- Basic auth on dashboard (can extend to OAuth)
- Database credentials in environment variables
- API rate limiting recommended
- HTTPS enforced in production

## Troubleshooting

### CSV Import Not Working
- Check `backend/uploads` folder exists
- Verify CSV format (runId, uniqueId, q1, q2 are required)
- Check backend logs for parse errors

### Sentiment Analysis Slow
- OpenAI API calls take ~2-5 seconds per comment
- Adjust worker interval in `backend/src/server.ts`
- Use GPT-3.5-turbo for faster (cheaper) analysis

### Agent Not Responding
- Verify OpenAI API key is set
- Check API rate limits
- Ensure survey has processed responses (wait for sentiment analysis)

## Future Enhancements

- [ ] Real-time data sync instead of CSV imports
- [ ] Mobile app
- [ ] Custom dashboards/reports
- [ ] Predictive analytics (trending issues)
- [ ] Multi-language support
- [ ] Slack/Email integrations
- [ ] Custom alert thresholds

## License

MIT
