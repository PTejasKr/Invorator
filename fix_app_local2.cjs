const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace loadDatabase
content = content.replace(
  /const loadDatabase = async \(uid\) => \{[\s\S]*?setHistory\(\[\]\);\s+\}\s+\};/,
  `const loadDatabase = async (uid) => {
    try {
      const data = JSON.parse(localStorage.getItem('invoices') || '[]');
      setHistory(data);
    } catch (err) {
      console.error("Failed to load invoice history from localStorage:", err);
      setHistory([]);
    }
  };`
);

// Replace currency conversion fetch
content = content.replace(
  /const batchedUpdates = convertedHistory\.map\(inv =>[\s\S]*?fetch\("https:\/\/invorator\.fly\.dev\/api\/invoices"\, \{[\s\S]*?\}\)[\s\S]*?\)\);/,
  `localStorage.setItem('invoices', JSON.stringify(convertedHistory));`
);
content = content.replace(
  /await Promise\.all\(batchedUpdates\);/,
  ``
);

fs.writeFileSync('src/App.jsx', content);
