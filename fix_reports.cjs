const fs = require('fs');

let content = fs.readFileSync('src/components/Reports.jsx', 'utf8');

content = content.replace(
  /const response = await fetch\("https:\/\/invorator\.fly\.dev\/api\/einvoice\/generate"\, \{[\s\S]*?\}\);[\s\S]*?const data = await response\.json\(\);/g,
  `// Simulate API call for e-invoice
      await new Promise(resolve => setTimeout(resolve, 1500));
      const chars = 'abcdef0123456789';
      let fakeIrn = '';
      for(let i=0; i<64; i++) {
        fakeIrn += chars[Math.floor(Math.random() * chars.length)];
      }
      const data = {
        success: true,
        irn: fakeIrn,
        ackNo: 'ACK' + Math.floor(100000000 + Math.random() * 900000000),
        ackDate: new Date().toISOString(),
        qrCodeData: 'https://einvoice1.gst.gov.in/qr?irn=' + fakeIrn
      };`
);

fs.writeFileSync('src/components/Reports.jsx', content);
