# Deployment Guide

## Render Deployment

### 1. Connect the repository
- Log in to Render and connect your GitHub account.
- Import the `mbytemak/surveyAgent` repository.

### 2. Create the PostgreSQL database
- Add a new Render PostgreSQL database.
- Name it `survey-analytics-db`.
- Use Postgres 15.
- Keep the plan as `Starter` or higher.

### 3. Create the backend service
- Service Type: `Web Service`
- Name: `survey-analytics-backend`
- Environment: `Node`
- Branch: `main`
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Auto-Deploy: enabled

#### Backend environment variables
- `PORT=3001`
- `CSV_UPLOAD_PATH=./uploads`
- `NODE_ENV=production`

Render will automatically add the following from the managed database:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### 4. Create the frontend service
- Service Type: `Static Site`
- Name: `survey-analytics-frontend`
- Branch: `main`
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Path: `dist`
- Auto-Deploy: enabled

#### Frontend environment variable
- `VITE_API_URL=https://survey-analytics-backend.onrender.com`

### 5. Deploy and verify
- Deploy both services.
- Verify backend health at `/health`.
- Verify frontend loads and can call the API.

## Local Run

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Update .env values
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Notes

- `render.yaml` is included for Render auto-deploy support.
- The frontend Dockerfile uses Nginx and serves `dist`.
- The backend Dockerfile builds TypeScript and runs `dist/server.js`.
- Keep `.env` out of source control.
