import { OpenAI } from 'openai';
import pool from '../models/db';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing or empty');
  }
  return new OpenAI({ apiKey });
}

export interface SentimentAnalysisResult {
  sentiment: number; // 0-1 score
  topics: string[]; // 3-5 key topics
  severity: 'critical' | 'warning' | 'neutral'; // severity level
  summary: string; // short summary
}

export async function analyseSentiment(comment: string): Promise<SentimentAnalysisResult> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a sentiment analysis expert. Analyze the given customer survey comment and provide:
1. A sentiment score from 0 to 1 (0=very negative, 0.5=neutral, 1=very positive)
2. 2-3 key topics (themes) from the comment
3. A severity level: 'critical' (urgent issue reported), 'warning' (concern but manageable), or 'neutral' (feedback)
4. A brief 1-line summary

Respond in JSON format: {"sentiment": 0.7, "topics": ["topic1", "topic2"], "severity": "neutral", "summary": "..."}`,
        },
        {
          role: 'user',
          content: `Analyze this survey comment: "${comment}"`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return {
      sentiment: Math.max(0, Math.min(1, parsed.sentiment || 0.5)),
      topics: parsed.topics || [],
      severity: parsed.severity || 'neutral',
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    // Fallback: simple heuristics
    const sentiment = comment.toLowerCase().includes('bad') ? 0.2 : 0.5;
    return {
      sentiment,
      topics: [],
      severity: 'neutral',
      summary: 'Analysis failed',
    };
  }
}

export async function processPendingResponses(batchSize: number = 20): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Get responses without sentiment analysis
    const result = await pool.query(
      `SELECT id, q2 FROM survey_responses 
       WHERE sentiment IS NULL AND q2 IS NOT NULL 
       LIMIT $1`,
      [batchSize]
    );

    const responses = result.rows;

    for (const response of responses) {
      try {
        const analysis = await analyseSentiment(response.q2);

        // Update response with sentiment data
        await pool.query(
          `UPDATE survey_responses 
           SET sentiment = $1, topics = $2, severity = $3 
           WHERE id = $4`,
          [analysis.sentiment, analysis.topics.length > 0 ? analysis.topics : null, analysis.severity, response.id]
        );

        // Create alert if critical
        if (analysis.severity === 'critical') {
          await pool.query(
            `INSERT INTO alerts (survey_id, response_id, severity, comment_snippet) 
             SELECT survey_id, $1, $2, $3 FROM survey_responses WHERE id = $4`,
            [response.id, 'critical', response.q2.substring(0, 100), response.id]
          );
        }

        processed++;
      } catch (itemError) {
        errors.push(`Response ${response.id}: ${(itemError as Error).message}`);
      }
    }

    // Update survey summaries
    if (processed > 0) {
      await updateSurveySummaries();
    }

    return { processed, errors };
  } catch (error) {
    errors.push(`Batch processing error: ${(error as Error).message}`);
    return { processed: 0, errors };
  }
}

export async function updateSurveySummaries() {
  try {
    await pool.query(`
      UPDATE surveys s SET
        total_responses = sr_counts.total,
        avg_rating = sr_counts.avg_rating,
        sentiment_positive = sr_counts.positive,
        sentiment_neutral = sr_counts.neutral,
        sentiment_negative = sr_counts.negative
      FROM (
        SELECT 
          survey_id,
          COUNT(*) as total,
          ROUND(AVG(CAST(q1 AS DECIMAL)), 2) as avg_rating,
          COUNT(*) FILTER (WHERE sentiment > 0.6) as positive,
          COUNT(*) FILTER (WHERE sentiment BETWEEN 0.4 AND 0.6) as neutral,
          COUNT(*) FILTER (WHERE sentiment < 0.4) as negative
        FROM survey_responses
        GROUP BY survey_id
      ) sr_counts
      WHERE s.id = sr_counts.survey_id
    `);
  } catch (error) {
    console.error('Survey summary update error:', error);
  }
}

export async function startSentimentWorker(intervalMs: number = 30000) {
  console.log(`Starting sentiment analysis worker (interval: ${intervalMs}ms)`);

  // Run once immediately
  await processPendingResponses();

  // Then run on interval
  setInterval(async () => {
    const result = await processPendingResponses();
    if (result.processed > 0) {
      console.log(`Processed ${result.processed} responses`);
    }
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
  }, intervalMs);
}
