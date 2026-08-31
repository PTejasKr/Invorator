const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/import \{ collection.*?firebase\/firestore";\r?\n/, '');
content = content.replace(/import \{ onAuthStateChanged.*?firebase\/auth";\r?\n/, '');
content = content.replace(/import \{ db, auth \} from "\.\/utils\/firebase";\r?\n/, '');

content = content.replace('const [authLoading, setAuthLoading] = useState(true);', 'const [authLoading, setAuthLoading] = useState(false);');
content = content.replace('const [user, setUser] = useState(null);', 'const [user, setUser] = useState({ uid: "local_user" });');

content = content.replace(/  useEffect\(\(\) => \{\r?\n(?:.|\r|\n)*?\}, \[\]\);\r?\n/, 
`  useEffect(() => {
    loadDatabase("local_user");
  }, []);
`);

content = content.replace(/  const loadDatabase = async \(uid\) => \{\r?\n(?:.|\r|\n)*?  \};\r?\n/, 
`  const loadDatabase = async (uid) => {
    try {
      const res = await fetch(\`/api/invoices?userId=\${uid}\`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load invoice history from backend:", err);
      setHistory([]);
    }
  };
`);

content = content.replace(/const batch = writeBatch\(db\);(?:.|\r|\n)*?await batch\.commit\(\);\r?\n\s*setHistory\(convertedHistory\);/,
`        await Promise.all(history.map(async inv => {
          const rate = data.rates[newCurr];
          const convertedItems = (inv.items || []).map(item => ({
            ...item,
            rate: Math.round((item.rate * rate) * 100) / 100,
            total: Math.round((item.total * rate) * 100) / 100
          }));
          const updatedInv = {
            ...inv,
            currency: newCurr,
            subtotal: Math.round((inv.subtotal * rate) * 100) / 100,
            taxAmount: Math.round((inv.taxAmount * rate) * 100) / 100,
            total: Math.round((inv.total * rate) * 100) / 100,
            items: convertedItems
          };
          await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...updatedInv, userId: "local_user" })
          });
          return updatedInv;
        }));
        // setHistory will trigger on reload or could be set locally
        loadDatabase("local_user");`);

// new save
content = content.replace(/const invRef = doc\(db, "invoices", invoiceId\);\s+const toSave = \{ \.\.\.inv, userId: user\.uid \};\s+await updateDoc\(invRef, toSave\)\.catch\(async \(\) => \{\s+const \{ setDoc \} = await import\("firebase\/firestore"\);\s+await setDoc\(invRef, toSave\);\s+\}\);/, 
`const toSave = { ...inv, id: invoiceId, userId: "local_user" };
                await fetch("/api/invoices", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(toSave)
                });`);

// edit save
content = content.replace(/const invRef = doc\(db, "invoices", String\(inv\.id\)\);\s+const toSave = \{ \.\.\.inv, userId: user\.uid \};\s+await updateDoc\(invRef, toSave\);/, 
`const toSave = { ...inv, userId: "local_user" };
                await fetch("/api/invoices", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(toSave)
                });`);

// delete
content = content.replace(/await deleteDoc\(doc\(db, "invoices", String\(id\)\)\);/g, 
`await fetch(\`/api/invoices/\${id}\`, { method: "DELETE" });`);

fs.writeFileSync('src/App.jsx', content);
