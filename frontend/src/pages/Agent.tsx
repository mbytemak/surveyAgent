import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { agentAPI } from '../api/client';
import './Agent.css';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  dataPoints?: Array<{ key: string; value: string }>;
  timestamp: Date;
}

export default function Agent() {
  const { runId } = useParams<{ runId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    'What are the top complaints?',
    'Show me all negative feedback',
    'What are the most common themes?',
    "How satisfied are our customers?",
    'Are there any critical issues I should know about?',
  ];

  const handleSendMessage = async (question: string) => {
    if (!runId || !question.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Math.random().toString(36),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await agentAPI.ask(runId, question);

      const agentMessage: Message = {
        id: Math.random().toString(36),
        type: 'agent',
        content: response.data.answer,
        dataPoints: response.data.dataPoints,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      setError((err as Error).message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-container">
      <div className="agent-header">
        <div>
          <h1>🤖 Survey AI Agent</h1>
          <p>Ask questions about survey responses for {runId}</p>
        </div>
        <Link to={`/survey/${runId}`} className="agent-back-link">
          ← Back to Survey
        </Link>
      </div>

      <div className="chat-interface">
        {/* Messages */}
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Ask me anything about this survey</h2>
              <p>I can help you understand feedback, identify themes, and spot issues.</p>

              <div className="suggested-questions">
                <p className="suggestion-label">Try asking:</p>
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    className="suggestion-button"
                    onClick={() => handleSendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message message-${message.type}`}>
                <div className="message-content">
                  <p>{message.content}</p>
                  {message.dataPoints && message.dataPoints.length > 0 && (
                    <div className="data-points">
                      {message.dataPoints.map((point, idx) => (
                        <div key={idx} className="data-point">
                          <span className="data-key">{point.key}:</span>
                          <span className="data-value">{point.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="message message-agent loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {error && <div className="message message-error">Error: {error}</div>}
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSendMessage(input);
                }
              }}
              placeholder="Ask me a question about the survey..."
              disabled={loading}
            />
            <button onClick={() => handleSendMessage(input)} disabled={loading || !input.trim()}>
              Send →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
