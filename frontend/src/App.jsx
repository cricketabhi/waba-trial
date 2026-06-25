import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Activity, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function App() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [to, setTo] = useState('');
  const [messageType, setMessageType] = useState('text');
  
  // Text message states
  const [text, setText] = useState('');
  
  // Document message states
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentCaption, setDocumentCaption] = useState('');
  const [documentFilename, setDocumentFilename] = useState('');
  
  // Template message states
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateVariables, setTemplateVariables] = useState([]);

  // General states
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

  // Fetch templates when user selects "template"
  useEffect(() => {
    if (messageType === 'template' && templates.length === 0) {
      const fetchTemplates = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/templates`);
          // Filter to only APPROVED templates
          const approved = response.data.filter(t => t.status === 'APPROVED');
          setTemplates(approved);
          if (approved.length > 0) handleTemplateChange(approved[0]);
        } catch (error) {
          console.error('Error fetching templates:', error);
          const msg = error.response?.data?.error || error.message || 'Could not load templates.';
          setStatusMsg({ type: 'error', text: `Template Fetch Error: ${msg}` });
        }
      };
      fetchTemplates();
    }
  }, [messageType]);

  const handleTemplateChange = (templateObj) => {
    // stringify the whole object as value for easy parsing, or just store the name
    setSelectedTemplate(JSON.stringify(templateObj));
    
    // Find how many variables we need in the body
    const bodyComponent = templateObj.components.find(c => c.type === 'BODY');
    if (bodyComponent && bodyComponent.text) {
      const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
      const count = matches ? new Set(matches).size : 0;
      // Initialize empty array for variables
      setTemplateVariables(Array(count).fill(''));
    } else {
      setTemplateVariables([]);
    }
  };

  const updateTemplateVariable = (index, value) => {
    const newVars = [...templateVariables];
    newVars[index] = value;
    setTemplateVariables(newVars);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      let payload = {
        phoneNumberId,
        to,
        type: messageType
      };

      if (messageType === 'text') {
        payload.text = text;
      } else if (messageType === 'document') {
        payload.documentUrl = documentUrl;
        payload.documentCaption = documentCaption;
        payload.documentFilename = documentFilename;
      } else if (messageType === 'template') {
        if (!selectedTemplate) throw new Error("No template selected");
        const tObj = JSON.parse(selectedTemplate);
        payload.templateName = tObj.name;
        payload.templateLanguage = tObj.language;
        
        if (templateVariables.length > 0) {
          // Format components for Meta Graph API
          // Right now we only support BODY parameters for simplicity
          const parameters = templateVariables.map(v => ({ type: 'text', text: v }));
          payload.templateComponents = [
            {
              type: 'body',
              parameters: parameters
            }
          ];
        }
      }

      await axios.post(`${API_BASE_URL}/send-message`, payload);
      setStatusMsg({ type: 'success', text: 'Message sent successfully!' });
      
      // Clear inputs
      setText('');
      setDocumentUrl('');
      setDocumentCaption('');
      setDocumentFilename('');
      setTemplateVariables(templateVariables.map(() => ''));
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error?.message || error.message || 'Failed to send message.';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Helper to get raw JSON string
  const getSelectedTemplateObj = () => {
    try {
      return JSON.parse(selectedTemplate);
    } catch {
      return null;
    }
  };
  const activeT = getSelectedTemplateObj();

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
              <label htmlFor="phoneNumberId">Phone Number ID</label>
              <input 
                type="text" 
                id="phoneNumberId"
                className="form-control"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 1093967187143767"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="to">Recipient Phone (Country code + Number)</label>
              <input 
                type="text" 
                id="to"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. 918123700851"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="messageType">Message Type</label>
              <select 
                id="messageType"
                className="form-control"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
              >
                <option value="text">Text (Requires open 24h window)</option>
                <option value="document">Document (Requires open 24h window)</option>
                <option value="template">Template (Can start conversation)</option>
              </select>
            </div>

            {/* TEXT UI */}
            {messageType === 'text' && (
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
            )}

            {/* DOCUMENT UI */}
            {messageType === 'document' && (
              <>
                <div className="form-group">
                  <label htmlFor="documentUrl">Document URL</label>
                  <input 
                    type="url" 
                    id="documentUrl"
                    className="form-control"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://example.com/file.pdf"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="documentFilename">Filename (Optional)</label>
                  <input 
                    type="text" 
                    id="documentFilename"
                    className="form-control"
                    value={documentFilename}
                    onChange={(e) => setDocumentFilename(e.target.value)}
                    placeholder="e.g. invoice.pdf"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="documentCaption">Caption (Optional)</label>
                  <input 
                    type="text" 
                    id="documentCaption"
                    className="form-control"
                    value={documentCaption}
                    onChange={(e) => setDocumentCaption(e.target.value)}
                    placeholder="Check out this document!"
                  />
                </div>
              </>
            )}

            {/* TEMPLATE UI */}
            {messageType === 'template' && (
              <>
                <div className="form-group">
                  <label htmlFor="templateSelector">Select Template</label>
                  {templates.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading templates...</p>
                  ) : (
                    <select 
                      id="templateSelector"
                      className="form-control"
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(JSON.parse(e.target.value))}
                    >
                      {templates.map(t => (
                        <option key={t.id} value={JSON.stringify(t)}>
                          {t.name} ({t.language})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {activeT && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Template Preview:</p>
                    <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                      {activeT.components.find(c => c.type === 'BODY')?.text || 'No body text'}
                    </p>
                  </div>
                )}

                {templateVariables.map((variable, idx) => (
                  <div className="form-group" key={idx}>
                    <label>Variable {`{{${idx + 1}}}`}</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={variable}
                      onChange={(e) => updateTemplateVariable(idx, e.target.value)}
                      placeholder={`Value for {{${idx + 1}}}`}
                      required
                    />
                  </div>
                ))}
              </>
            )}

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
