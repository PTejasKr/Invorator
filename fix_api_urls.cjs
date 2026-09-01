const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  content = content.replace(/fetch\("(\/api\/[^\"]+)"/g, 'fetch("https://invorator.fly.dev$1"');
  content = content.replace(/fetch\(`(\/api\/[^\`]+)`/g, 'fetch(`https://invorator.fly.dev$1`');
  content = content.replace(/fetch\('(\/api\/[^\']+)'/g, 'fetch(\'https://invorator.fly.dev$1\'');
  
  content = content.replace(/fetch\("http:\/\/localhost:3001(\/api\/[^\"]+)"/g, 'fetch("https://invorator.fly.dev$1"');
  content = content.replace(/fetch\(`http:\/\/localhost:3001(\/api\/[^\`]+)`/g, 'fetch(`https://invorator.fly.dev$1`');
  content = content.replace(/fetch\('http:\/\/localhost:3001(\/api\/[^\']+)'/g, 'fetch(\'https://invorator.fly.dev$1\'');
  
  if (original !== content) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  }
}

scanDir(path.join(__dirname, 'src'));
