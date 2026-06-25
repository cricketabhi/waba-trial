import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Activity, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function App() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Poll for activities every 3 seconds
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/activity`);
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      await axios.post(`${API_BASE_URL}/send-message`, {
        phoneNumberId,
        to,
        type: 'text',
        text
      });
      setStatusMsg({ type: 'success', text: 'Message sent successfully!' });
      setText(''); // clear text
    } catch (error) {
      console.error(error);
      setStatusMsg({ 
        type: 'error', 
        text: error.response?.data?.error?.message || 'Failed to send message.' 
      });
    } finally {
      setLoading(false);
      // Auto clear status
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>WABA Dashboard</h1>
        <p>WhatsApp Business API Interface</p>
      </header>

      <div className="grid-container">
        {/* Send Message Panel */}
        <div className="panel">
          <div className="panel-title">
            <Send size={24} color="#10b981" />
            Send Message
          </div>
          
          <form onSubmit={handleSendMessage}>
            <div className="form-group">
              <label htmlFor="phoneNumberId">Phone Number ID (From Meta)</label>
              <input 
                type="text" 
                id="phoneNumberId"
                className="form-control"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 101234567890123"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="to">Recipient Phone Number (with country code)</label>
              <input 
                type="text" 
                id="to"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. 15551234567"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="text">Message Text</label>
              <textarea 
                id="text"
                className="form-control"
                rows="4"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message here..."
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : (
                <>
                  <Send size={18} /> Send Message
                </>
              )}
            </button>

            {statusMsg && (
              <div style={{
                marginTop: '1rem', 
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: statusMsg.type === 'success' ? '#10b981' : '#ef4444'
              }}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {statusMsg.text}
              </div>
            )}
          </form>
        </div>

        {/* Webhook Activity Panel */}
        <div className="panel">
          <div className="panel-title">
            <Activity size={24} color="#38bdf8" />
            Activity Log
          </div>

          {activities.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={48} opacity={0.5} />
              <p>No activity yet. Send a message or wait for incoming notifications.</p>
            </div>
          ) : (
            <div className="activity-list">
              {activities.map((act, index) => (
                <div key={act.id || index} className="activity-item" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="activity-header">
                    <span className={`badge ${act.type === 'incoming' ? 'badge-incoming' : 'badge-outgoing'}`}>
                      {act.type}
                    </span>
                    <span className="activity-time">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="activity-body">
                    {act.type === 'outgoing' ? (
                      <div>
                        To: {act.to} <br />
                        Type: {act.messageType}
                      </div>
                    ) : (
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(act.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
