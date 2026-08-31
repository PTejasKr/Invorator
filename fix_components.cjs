const fs = require('fs');
const path = require('path');

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.includes('firebase/firestore') || content.includes('./utils/firebase') || content.includes('../utils/firebase')) {
    // Remove imports
    content = content.replace(/import \{.*?\} from "firebase\/firestore";\r?\n/g, '');
    content = content.replace(/import \{.*?\} from "(?:\.\.|\.)\/utils\/firebase";\r?\n/g, '');
    changed = true;
  }

  const endpointMap = {
    'Inventory.jsx': 'inventory',
    'Parties.jsx': 'parties',
    'Settings.jsx': 'settings',
    'Reports.jsx': 'invoices' // Assuming Reports reads from invoices
  };

  const endpoint = endpointMap[file];

  if (endpoint) {
    if (file === 'Settings.jsx') {
      content = content.replace(/const loadSettings = async \(\) => \{\r?\n(?:.|\r|\n)*?  \};\r?\n/, 
`  const loadSettings = async () => {
    try {
      const res = await fetch(\`/api/\${endpoint}?userId=local_user\`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data || defaultSettings);
        if (onProfileUpdate) onProfileUpdate(data || defaultSettings);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };
`);

      content = content.replace(/const handleSave = async \(e\) => \{\r?\n(?:.|\r|\n)*?    \};\r?\n/,
`  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const toSave = { ...settings, userId: "local_user" };
      await fetch(\`/api/\${endpoint}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave)
      });
      if (onProfileUpdate) onProfileUpdate(settings);
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };
`);
    } else if (file === 'Reports.jsx') {
      content = content.replace(/const loadData = async \(\) => \{\r?\n(?:.|\r|\n)*?  \};\r?\n/,
`  const loadData = async () => {
    try {
      const res = await fetch(\`/api/invoices?userId=local_user\`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };
`);
    } else {
      // Inventory or Parties
      content = content.replace(/const loadData = async \(\) => \{\r?\n(?:.|\r|\n)*?  \};\r?\n/,
`  const loadData = async () => {
    try {
      const res = await fetch(\`/api/\${endpoint}?userId=local_user\`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };
`);

      content = content.replace(/const handleSave = async \(e\) => \{\r?\n(?:.|\r|\n)*?    \};\r?\n/,
`  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let id = editingItem ? editingItem.id : String(Date.now());
      const toSave = { ...formData, id, userId: "local_user" };
      await fetch(\`/api/\${endpoint}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave)
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };
`);

      content = content.replace(/const handleDelete = async \(id\) => \{\r?\n(?:.|\r|\n)*?  \};\r?\n/,
`  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await fetch(\`/api/\${endpoint}/\${id}\`, { method: "DELETE" });
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };
`);
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
});
