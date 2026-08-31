const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Invorator API is running.' });
});

// WhatsApp Route Scaffold
app.post('/api/whatsapp/send', (req, res) => {
  const { phone, message, pdfUrl } = req.body;
  
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }

  // TODO: Integrate with WhatsApp Business API (Meta/Twilio)
  console.log('[WhatsApp Mock] Sending to ' + phone + ': ' + message);
  if (pdfUrl) {
    console.log('[WhatsApp Mock] Attached PDF: ' + pdfUrl);
  }

  // Simulating an API call delay
  setTimeout(() => {
    res.json({ 
      success: true, 
      message: 'WhatsApp message sent successfully (Simulated)',
      messageId: 'wa_' + Date.now()
    });
  }, 1000);
});

// E-Invoice Route Scaffold
app.post('/api/einvoice/generate', (req, res) => {
  const { invoiceData } = req.body;
  
  if (!invoiceData || !invoiceData.invoiceNumber) {
    return res.status(400).json({ success: false, error: 'Valid invoice data is required.' });
  }

  // TODO: Integrate with real GSP (GST Suvidha Provider) API
  console.log('[E-Invoice Mock] Generating IRN for Invoice: ' + invoiceData.invoiceNumber);

  // Simulate GSP API delay and return simulated IRN and QR
  setTimeout(() => {
    // Generate a fake 64-character hash for IRN
    const chars = 'abcdef0123456789';
    let fakeIrn = '';
    for(let i=0; i<64; i++) {
      fakeIrn += chars[Math.floor(Math.random() * chars.length)];
    }

    res.json({
      success: true,
      irn: fakeIrn,
      ackNo: 'ACK' + Math.floor(100000000 + Math.random() * 900000000),
      ackDate: new Date().toISOString(),
      qrCodeData: 'https://einvoice1.gst.gov.in/qr?irn=' + fakeIrn
    });
  }, 2000);
});

// Start Server
app.listen(PORT, () => {
  console.log('Backend server is running on http://localhost:' + PORT);
});
