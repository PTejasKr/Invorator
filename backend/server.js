const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Invorator API is running.' });
});

// PDF Generation Route
app.post('/api/invoices/pdf', async (req, res) => {
  try {
    const { invoiceData } = req.body;
    if (!invoiceData) {
      return res.status(400).json({ error: 'Invoice data required' });
    }

    // Format currencies for template
    const formatCurrency = (val) => {
      const currency = invoiceData.currency || "USD";
      if (currency === "INR") {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val || 0);
      }
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
    };

    // Enrich items with formatted amounts
    const enrichedData = {
      ...invoiceData,
      items: (invoiceData.items || []).map(item => ({
        ...item,
        amountFormatted: formatCurrency(item.amount)
      })),
      subtotalFormatted: formatCurrency(invoiceData.subtotal),
      taxFormatted: formatCurrency(invoiceData.tax),
      amountPaidFormatted: formatCurrency(invoiceData.amountPaid),
      balanceFormatted: formatCurrency(invoiceData.balance),
    };

    const templatePath = path.join(__dirname, 'templates', 'invoice.ejs');
    const html = await ejs.renderFile(templatePath, enrichedData);

    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: "new"
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice_${invoiceData.invoiceNumber || 'New'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
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



// SQLite REST APIs
const db = require('./db');

app.get('/api/invoices', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const rows = db.prepare('SELECT * FROM invoices WHERE userId = ? ORDER BY createdAt DESC').all(userId);
    const parsed = rows.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.createdAt }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', (req, res) => {
  const { id, userId, ...data } = req.body;
  if (!userId || !id) return res.status(400).json({ error: 'userId and id required' });
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO invoices (id, userId, data, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    stmt.run(id, userId, JSON.stringify(data));
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// React Router fallback (must be after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('Backend server is running on http://localhost:' + PORT);
});
