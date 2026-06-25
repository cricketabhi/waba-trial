require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;
const API_VERSION = process.env.API_VERSION || 'v18.0';

// In-memory storage for messages to serve the frontend
let messagesActivity = [];

// ==========================================
// Webhook Verification (GET)
// ==========================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing mode or token');
  }
});

// ==========================================
// Receive Messages & Notifications (POST)
// ==========================================
app.post('/webhook', (req, res) => {
  const body = req.body;

  console.log('Incoming webhook message:', JSON.stringify(body, null, 2));

  // Check if this is an event from a WhatsApp API
  if (body.object === 'whatsapp_business_account') {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value
    ) {
      const changeValue = body.entry[0].changes[0].value;
      
      // Store the activity for the frontend
      const activity = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'incoming',
        data: changeValue,
      };
      messagesActivity.unshift(activity); // Add to the beginning
      // Keep only last 100 activities
      if (messagesActivity.length > 100) messagesActivity.pop();

      // Extract details
      if (changeValue.messages && changeValue.messages[0]) {
        const message = changeValue.messages[0];
        console.log(`\n[WEBHOOK] Received message from ${message.from}:`, JSON.stringify(message, null, 2));
      } else if (changeValue.statuses && changeValue.statuses[0]) {
        const status = changeValue.statuses[0];
        console.log(`\n[WEBHOOK] Status update for message ${status.id}: ${status.status}`);
        if (status.errors) {
          console.error(`[WEBHOOK ERROR] Delivery failed. Reason:`, JSON.stringify(status.errors, null, 2));
        }
      }
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// ==========================================
// API for Frontend: Get Messages Activity
// ==========================================
app.get('/api/activity', (req, res) => {
  res.json(messagesActivity);
});

// ==========================================
// API to Send Messages
// ==========================================
app.post('/api/send-message', async (req, res) => {
  const { phoneNumberId, to, type, text, documentUrl, documentCaption, documentFilename, templateName, templateLanguage } = req.body;

  if (!phoneNumberId || !to) {
    return res.status(400).json({ error: 'Missing phoneNumberId or to' });
  }

  let data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: type || 'text',
  };

  if (data.type === 'text') {
    if (!text) return res.status(400).json({ error: 'Missing text content for text message' });
    data.text = { preview_url: false, body: text };
  } else if (data.type === 'document') {
    if (!documentUrl) return res.status(400).json({ error: 'Missing documentUrl for document message' });
    data.document = {
      link: documentUrl,
      caption: documentCaption || '',
      filename: documentFilename || 'document'
    };
  } else if (data.type === 'template') {
    if (!templateName || !templateLanguage) return res.status(400).json({ error: 'Missing templateName or templateLanguage' });
    data.template = {
      name: templateName,
      language: { code: templateLanguage }
    };
  }

  try {
    console.log(`\n[SENDING MESSAGE] Preparing to send to ${to}`);
    console.log(`[PAYLOAD]`, JSON.stringify(data, null, 2));

    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
      data: data,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[META RESPONSE] Success:`, JSON.stringify(response.data, null, 2));

    // Store outgoing activity
    const activity = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'outgoing',
      to: to,
      messageType: data.type,
      response: response.data
    };
    messagesActivity.unshift(activity);
    if (messagesActivity.length > 100) messagesActivity.pop();

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response ? error.response.data : 'Internal server error' });
  }
});

// ==========================================
// Clear Activity
// ==========================================
app.post('/api/clear-activity', (req, res) => {
  messagesActivity = [];
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend server listening at http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
