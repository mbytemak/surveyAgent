import { useEffect, useState, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { surveyAPI, uploadAPI } from '../api/client';
import { Survey } from '../types';
import './Home.css';

export default function Home() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const response = await surveyAPI.getSurveys();
        setSurveys(response.data);
      } catch (err) {
        setError('Failed to fetch surveys');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  if (loading) return <div className="container"><p>Loading surveys...</p></div>;
  if (error) return <div className="container error">{error}</div>;

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Survey Analytics Dashboard</h1>
        <p>View and analyze customer satisfaction survey responses</p>
      </div>

      <div className="upload-card">
        <h2>Upload survey CSV</h2>
        <input
          type="file"
          accept=".csv"
          onChange={async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setUploading(true);
            setUploadMessage(null);

            try {
              const text = await file.text();
              const response = await uploadAPI.uploadCSV(text);
              setUploadMessage(response.data?.message || 'Upload successful.');
              setError(null);
              setTimeout(() => window.location.reload(), 1500);
            } catch (uploadError) {
              console.error(uploadError);
              setUploadMessage('Upload failed.');
            } finally {
              setUploading(false);
            }
          }}
        />
        {uploading && <p>Uploading CSV...</p>}
        {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
      </div>

      <div className="surveys-grid">
        {surveys.length === 0 ? (
          <p className="empty-state">No surveys yet. Upload a CSV file to get started.</p>
        ) : (
          surveys.map((survey) => {
            const sentimentTotal =
              survey.sentimentDistribution.positive +
              survey.sentimentDistribution.neutral +
              survey.sentimentDistribution.negative;

            return (
              <Link to={`/survey/${survey.runId}`} key={survey.id} className="survey-card">
                <div className="card-header">
                  <h3>{survey.runId}</h3>
                  <span className="date">{new Date(survey.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="card-stats">
                  <div className="stat">
                    <span className="label">Responses</span>
                    <span className="value">{survey.totalResponses}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Avg Rating</span>
                    <span className="value">{survey.avgRating.toFixed(1)}/10</span>
                  </div>
                </div>

                <div className="sentiment-bar">
                  {sentimentTotal > 0 && (
                    <>
                      <div
                        className="bar-segment positive"
                        style={{
                          width: `${(survey.sentimentDistribution.positive / sentimentTotal) * 100}%`,
                        }}
                        title={`Positive: ${survey.sentimentDistribution.positive}`}
                      />
                      <div
                        className="bar-segment neutral"
                        style={{
                          width: `${(survey.sentimentDistribution.neutral / sentimentTotal) * 100}%`,
                        }}
                        title={`Neutral: ${survey.sentimentDistribution.neutral}`}
                      />
                      <div
                        className="bar-segment negative"
                        style={{
                          width: `${(survey.sentimentDistribution.negative / sentimentTotal) * 100}%`,
                        }}
                        title={`Negative: ${survey.sentimentDistribution.negative}`}
                      />
                    </>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
