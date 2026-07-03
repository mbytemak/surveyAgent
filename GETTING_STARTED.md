# Implementation Complete! 🎉

The survey analytics dashboard + AI agent system is fully built. Here's how to get it running:

## Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

## Step 2: Set Up Environment Variables

### Backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```

### Frontend
```bash
cd frontend
cp .env.example .env
```

## Step 3: Start PostgreSQL

Option A: Using Docker (easiest)
```bash
docker-compose up -d postgres
```

Option B: Connect to existing PostgreSQL
Edit `backend/.env` with your connection details.

## Step 4: Run Database Migrations

```bash
cd backend
npm run migrate
```

You should see: `✓ Migrations completed successfully`

## Step 5: Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
CSV watcher started...
Sentiment analysis worker started
```

## Step 6: Start the Frontend (in new terminal)

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v4.3.9 running at:
http://localhost:3000/
```

## Step 7: Upload Sample Survey Data

Open `http://localhost:3000` and you'll see the empty dashboard.

Upload the sample CSV:
```bash
cd /backend/uploads

# Copy sample-survey.csv here
cp ../../sample-survey.csv ./survey_$(date +%s).csv
```

Or: In the terminal, run:
```bash
# From workspace root
cp sample-survey.csv backend/uploads/survey_sample.csv
```

Wait 30 seconds for the backend to process it.

## Step 8: View Results

1. Refresh `http://localhost:3000`
2. You should see "survey-2026-06" survey card
3. Click to see:
   - KPI cards
   - Sentiment pie chart
   - Top topics bar chart
   - Response table

## Step 9: Try the AI Agent

Link from survey detail page goes to chat agent interface. Try asking:
- "What are the top complaints?"
- "Show me all negative feedback"
- "What are the most common themes?"

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### PostgreSQL connection error
- Check Docker container is running: `docker ps`
- Or verify .env has correct DB credentials

### OpenAI API error
- Verify API key is set in backend/.env
- Check you have API credits

### No CSV file processed
- Check file is in `backend/uploads/`
- Backend logs should show import status
- Wait 30 seconds for sentiment analysis to complete

### Sentiment analysis not working
- Verify OpenAI API key works
- Check backend console for errors
- Reduce batch size in sentimentAnalysis.ts if needed

## Next Steps

1. **Upload real Adobe Campaign survey data**: Place CSV in `backend/uploads/`
2. **Customize alerts**: Modify severity thresholds in sentimentAnalysis.ts
3. **Add authentication**: Implement basic auth/OAuth for dashboard
4. **Deploy to cloud**: Follow deployment guide in main README.md

## File Structure

```
copilot/
├── backend/
│   ├── src/
│   │   ├── api/routes.ts           → REST endpoints
│   │   ├── services/
│   │   │   ├── csvImporter.ts      → CSV processing
│   │   │   └── sentimentAnalysis.ts → LLM sentiment analysis
│   │   ├── agent/agentService.ts   → AI Agent logic
│   │   └── server.ts               → Main server
│   ├── migrations/001_init.ts       → Database schema
│   ├── uploads/                     → CSV drop folder
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            → Survey list
│   │   │   ├── SurveyDetail.tsx    → Dashboard with KPIs
│   │   │   └── Agent.tsx           → Chat interface
│   │   ├── api/client.ts           → API calls
│   │   ├── App.tsx                 → Main app
│   │   └── main.tsx                → Entry point
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Quick Commands

```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Start Frontend  
cd frontend && npm run dev

# Terminal 3: Upload Survey (when ready)
cp sample-survey.csv backend/uploads/survey_$(date +%s).csv
```

Open `http://localhost:3000` and start using!
