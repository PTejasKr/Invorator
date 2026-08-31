const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Rename DB to avoid schema conflicts with previous run
const dbPath = path.join(dataDir, 'invorator2.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    userId TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`);

module.exports = db;
