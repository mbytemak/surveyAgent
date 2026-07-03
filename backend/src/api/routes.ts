import express from 'express';
import pool from '../models/db';
import { Survey, SurveySummary, SurveyResponse } from '../models/types';

const router = express.Router();

// Get all surveys with summary
router.get('/surveys', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, run_id, created_at, total_responses, avg_rating,
        sentiment_positive, sentiment_neutral, sentiment_negative
      FROM surveys
      ORDER BY created_at DESC
    `);

    const surveys = result.rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      createdAt: row.created_at,
      totalResponses: row.total_responses || 0,
      avgRating: parseFloat(row.avg_rating) || 0,
      sentimentDistribution: {
        positive: row.sentiment_positive || 0,
        neutral: row.sentiment_neutral || 0,
        negative: row.sentiment_negative || 0,
      },
    }));

    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Get survey detail with summary
router.get('/surveys/:runId/summary', async (req, res) => {
  try {
    const { runId } = req.params;

    const surveyResult = await pool.query('SELECT id FROM surveys WHERE run_id = $1', [runId]);

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const surveyId = surveyResult.rows[0].id;

    // Get survey summary
    const summaryResult = await pool.query(
      `SELECT run_id, total_responses, avg_rating, sentiment_positive, sentiment_neutral, sentiment_negative, created_at
       FROM surveys WHERE id = $1`,
      [surveyId]
    );

    const row = summaryResult.rows[0];

    // Get top topics
    const topicsResult = await pool.query(
      `SELECT DISTINCT unnest(topics) as topic, COUNT(*) as count, AVG(sentiment) as avg_sentiment
       FROM survey_responses WHERE survey_id = $1 AND topics IS NOT NULL
       GROUP BY topic
       ORDER BY count DESC LIMIT 5`,
      [surveyId]
    );

    // Get critical alerts count
    const alertsResult = await pool.query(
      `SELECT COUNT(*) as count FROM alerts WHERE survey_id = $1 AND resolved = FALSE`,
      [surveyId]
    );

    const summary: SurveySummary = {
      runId: row.run_id,
      totalResponses: row.total_responses || 0,
      avgRating: parseFloat(row.avg_rating) || 0,
      sentimentDistribution: {
        positive: row.sentiment_positive || 0,
        neutral: row.sentiment_neutral || 0,
        negative: row.sentiment_negative || 0,
      },
      topTopics: topicsResult.rows.map((t) => ({
        topic: t.topic,
        count: parseInt(t.count),
        avgSentiment: parseFloat(t.avg_sentiment) || 0,
      })),
      criticalAlertsCount: parseInt(alertsResult.rows[0].count),
      createdAt: row.created_at,
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Get paginated survey responses
router.get('/surveys/:runId/responses', async (req, res) => {
  try {
    const { runId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const severity = req.query.severity as string;

    const offset = (page - 1) * limit;

    const surveyResult = await pool.query('SELECT id FROM surveys WHERE run_id = $1', [runId]);

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const surveyId = surveyResult.rows[0].id;

    let query = `SELECT * FROM survey_responses WHERE survey_id = $1`;
    const params: any[] = [surveyId];

    if (severity) {
      query += ` AND severity = $${params.length + 1}`;
      params.push(severity);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const responses = result.rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      uniqueId: row.unique_id,
      q1: row.q1,
      q2: row.q2,
      q3: row.q3,
      q4: row.q4,
      q5: row.q5,
      q6: row.q6,
      q7: row.q7,
      q8: row.q8,
      q9: row.q9,
      q10: row.q10,
      sentiment: parseFloat(row.sentiment) || null,
      topics: row.topics || [],
      severity: row.severity,
      createdAt: row.created_at,
    }));

    res.json({ page, limit, responses, total: result.rowCount });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Get topics breakdown
router.get('/surveys/:runId/topics', async (req, res) => {
  try {
    const { runId } = req.params;

    const surveyResult = await pool.query('SELECT id FROM surveys WHERE run_id = $1', [runId]);

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const surveyId = surveyResult.rows[0].id;

    const result = await pool.query(
      `SELECT DISTINCT unnest(topics) as topic, COUNT(*) as count, AVG(sentiment) as avg_sentiment
       FROM survey_responses WHERE survey_id = $1 AND topics IS NOT NULL
       GROUP BY topic
       ORDER BY count DESC`,
      [surveyId]
    );

    const topics = result.rows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count),
      avgSentiment: parseFloat(row.avg_sentiment),
    }));

    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, sr.q2 FROM alerts a
       JOIN survey_responses sr ON a.response_id = sr.id
       WHERE a.resolved = FALSE
       ORDER BY a.created_at DESC
       LIMIT 50`
    );

    const alerts = result.rows.map((row) => ({
      id: row.id,
      surveyId: row.survey_id,
      responseId: row.response_id,
      severity: row.severity,
      commentSnippet: row.q2 || row.comment_snippet,
      createdAt: row.created_at,
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as resolved
router.put('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;

    await pool.query('UPDATE alerts SET resolved = TRUE WHERE id = $1', [alertId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

export default router;
