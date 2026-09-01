const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace loadDatabase to use localStorage
content = content.replace(
  /const loadDatabase = async \(uid\) => {[\s\S]*?};\n/,
  `const loadDatabase = async (uid) => {
    try {
      const data = JSON.parse(localStorage.getItem('invoices') || '[]');
      setHistory(data);
    } catch (err) {
      console.error("Failed to load invoice history from localStorage:", err);
      setHistory([]);
    }
  };\n`
);

// Fix Delete in Dashboard 1
content = content.replace(
  /onDeleteInvoice=\{async \(id\) => \{\s+if \(!window\.confirm\("Are you sure\?"\)\) return;\s+await fetch\(`https:\/\/invorator\.fly\.dev\/api\/invoices\/\$\{id\}`\, \{ method: "DELETE" \}\);\s+setHistory\(h => h\.filter\(x => x\.id !== id\)\);\s+\}\}/g,
  `onDeleteInvoice={async (id) => {
                if (!window.confirm("Are you sure?")) return;
                const newHistory = history.filter(x => x.id !== id);
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
              }}`
);

// Fix Save in New
content = content.replace(
  /onSave=\{async \(inv\) => \{\s+const invoiceId = String\(Date\.now\(\)\);\s+const toSave = \{ \.\.\.inv\, id: invoiceId\, userId: user\.uid \};\s+await fetch\("https:\/\/invorator\.fly\.dev\/api\/invoices"\, \{\s+method: "POST"\,[\s\S]*?\}\);\s+setHistory\(\[\{ \.\.\.toSave\, id: invoiceId \}\, \.\.\.history\]\);\s+navigate\("\/invoices"\);\s+\}\}/g,
  `onSave={async (inv) => {
                const invoiceId = String(Date.now());
                const toSave = { ...inv, id: invoiceId, userId: user.uid };
                const newHistory = [{ ...toSave, id: invoiceId }, ...history];
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
                navigate("/invoices");
              }}`
);

// Fix Save in Edit
content = content.replace(
  /onSave=\{async \(inv\) => \{\s+\/\/ Implementation for edit\s+const toSave = \{ \.\.\.inv\, userId: user\.uid \};\s+await fetch\("https:\/\/invorator\.fly\.dev\/api\/invoices"\, \{\s+method: "POST"\,[\s\S]*?\}\);\s+setHistory\(history\.map\(h => h\.id === inv\.id \? toSave : h\)\);\s+navigate\("\/invoices"\);\s+\}\}/g,
  `onSave={async (inv) => {
                const toSave = { ...inv, userId: user.uid };
                const newHistory = history.map(h => h.id === inv.id ? toSave : h);
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
                navigate("/invoices");
              }}`
);

// Fix Download PDF to use window.print()
content = content.replace(
  /onDownloadPDF=\{async \(inv\) => \{[\s\S]*?\}\}/g,
  `onDownloadPDF={async (inv) => {
                navigate(\`/invoices/edit/\${inv.id}\`);
                setTimeout(() => window.print(), 500);
              }}`
);

// Fix shareInvoice
content = content.replace(
  /onShareInvoice=\{async \(inv\) => \{[\s\S]*?catch \(e\) \{[\s\S]*?\}\s+\}\}/g,
  `onShareInvoice={async (inv) => {
                alert("Sharing is not available in local-only mode.");
              }}`
);

// Remove batching code in conversion that calls fetch
content = content.replace(
  /const batchedUpdates = convertedHistory\.map\(inv =>[\s\S]*?fetch\("https:\/\/invorator\.fly\.dev\/api\/invoices"\, \{[\s\S]*?\}\)[\s\S]*?\)\);/,
  `localStorage.setItem('invoices', JSON.stringify(convertedHistory));`
);
content = content.replace(
  /await Promise\.all\(batchedUpdates\);/,
  ``
);

fs.writeFileSync('src/App.jsx', content);
