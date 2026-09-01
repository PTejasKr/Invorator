const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the specific block of code causing issues
content = content.replace(
  /await Promise\.all\(convertedHistory\.map\(inv =>[\s\S]*?fetch\("https:\/\/invorator\.fly\.dev\/api\/invoices"\, \{[\s\S]*?\}\)[\s\S]*?\)\);/g,
  `localStorage.setItem('invoices', JSON.stringify(convertedHistory));`
);

fs.writeFileSync('src/App.jsx', content);
