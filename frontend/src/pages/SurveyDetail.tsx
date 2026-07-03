import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { surveyAPI } from '../api/client';
import { SurveySummary, SurveyResponse } from '../types';
import './SurveyDetail.css';

export default function SurveyDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!runId) return;

        const [summaryRes, responsesRes] = await Promise.all([
          surveyAPI.getSurveySummary(runId),
          surveyAPI.getSurveyResponses(runId, page, 20, severity || undefined),
        ]);

        setSummary(summaryRes.data);
        setResponses(responsesRes.data.responses || []);
      } catch (err) {
        setError('Failed to fetch survey data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [runId, page, severity]);

  if (loading) return <div className="container"><p>Loading survey details...</p></div>;
  if (error || !summary) return <div className="container error">{error || 'Survey not found'}</div>;

  const sentimentData = [
    { name: 'Positive', value: summary.sentimentDistribution.positive },
    { name: 'Neutral', value: summary.sentimentDistribution.neutral },
    { name: 'Negative', value: summary.sentimentDistribution.negative },
  ];

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  const topicsData = summary.topTopics.map((topic) => ({
    topic: topic.topic,
    count: topic.count,
    sentiment: (topic.avgSentiment * 100).toFixed(0),
  }));

  return (
    <div className="container">
      <div className="survey-header">
        <div>
          <h1>📋 {summary.runId}</h1>
          <p>{new Date(summary.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="survey-header-actions">
          <Link to={`/survey/${runId}/agent`} className="agent-link-button">
            Ask the AI Assistant
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Responses</div>
          <div className="kpi-value">{summary.totalResponses}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average Rating</div>
          <div className="kpi-value">{summary.avgRating.toFixed(1)}/10</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Positive Feedback</div>
          <div className="kpi-value" style={{ color: '#22c55e' }}>
            {((summary.sentimentDistribution.positive / summary.totalResponses) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Critical Alerts</div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>
            {summary.criticalAlertsCount}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {sentimentData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Top Topics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Responses Table */}
      <div className="responses-section">
        <div className="section-header">
          <h3>Survey Responses</h3>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div className="responses-table">
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Sentiment</th>
                <th>Topics</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr key={response.id}>
                  <td className="mono">{response.uniqueId}</td>
                  <td>{response.q1}/10</td>
                  <td className="comment-cell">{response.q2?.substring(0, 80)}...</td>
                  <td>
                    <div className="sentiment-badge" style={{ backgroundColor: `rgba(34, 197, 94, ${response.sentiment})` }}>
                      {(response.sentiment * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td>
                    <div className="topics">
                      {response.topics.slice(0, 2).map((topic) => (
                        <span key={topic} className="topic-tag">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`severity-badge severity-${response.severity}`}>{response.severity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}
