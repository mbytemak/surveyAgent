import './initEnv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRoutes from './api/routes';
import { watchCSVFolder } from './services/csvImporter';
import { startSentimentWorker } from './services/sentimentAnalysis';
import { queryAgent } from './agent/agentService';

const app = express();
const PORT = process.env.PORT || 3001;
const CSV_UPLOAD_PATH = process.env.CSV_UPLOAD_PATH || './uploads';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// API routes
app.use('/api', apiRoutes);

// Agent endpoint
app.post('/api/agent/ask', async (req, res) => {
  try {
    const { runId, question } = req.body;

    if (!runId || !question) {
      return res.status(400).json({ error: 'Missing runId or question' });
    }

    const agentResponse = await queryAgent(runId, question);
    res.json(agentResponse);
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// File upload endpoint
app.post('/api/upload', express.text(), async (req, res) => {
  try {
    if (!fs.existsSync(CSV_UPLOAD_PATH)) {
      fs.mkdirSync(CSV_UPLOAD_PATH, { recursive: true });
    }

    const filename = `survey_${Date.now()}.csv`;
    const filepath = path.join(CSV_UPLOAD_PATH, filename);
    fs.writeFileSync(filepath, req.body);

    res.json({
      success: true,
      filename,
      message: 'CSV uploaded successfully. Processing will start shortly.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Processing status endpoint
app.get('/api/processing-status', async (req, res) => {
  try {
    if (!fs.existsSync(CSV_UPLOAD_PATH)) {
      return res.json({ pending: false, count: 0, files: [] });
    }

    const files = fs.readdirSync(CSV_UPLOAD_PATH).filter((name) => name.endsWith('.csv'));
    const pending = files.length > 0;
    res.json({ pending, count: files.length, files });
  } catch (error) {
    console.error('Processing status error:', error);
    res.status(500).json({ error: 'Failed to determine processing status' });
  }
});

// Start server after running migrations
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    const { runMigrations } = await import('./migrations/001_init');
    await runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Failed to run migrations during startup:', error);
    process.exit(1);
  }

  // Start CSV watcher
  watchCSVFolder(CSV_UPLOAD_PATH, 30000); // Check every 30 seconds
  console.log(`CSV watcher started. Monitoring: ${CSV_UPLOAD_PATH}`);

  // Start sentiment analysis worker
  startSentimentWorker(30000); // Process every 30 seconds
  console.log('Sentiment analysis worker started');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
