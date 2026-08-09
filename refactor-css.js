const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'app', '(dashboard)');

function getAllCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllCssFiles(filePath, fileList);
    } else if (filePath.endsWith('.module.css')) {
      if (filePath.includes('layout.module.css') || (filePath.includes('dashboard') && filePath.includes('page.module.css') && dir.endsWith('dashboard'))) {
        // Skip layout and main dashboard page
      } else {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const files = getAllCssFiles(directoryPath);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Header border
  content = content.replace(/border-bottom: 2px solid var\(--border-default\);/g, 'border-bottom: 1px solid var(--border-light);');
  
  // Replace Buttons
  content = content.replace(/\.btnAction \{[\s\S]*?box-shadow: 2px 2px 0px var\(--border-default\);\s*\}/g, `.btnAction {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}`);

  content = content.replace(/\.btnAction:hover \{[\s\S]*?box-shadow: 1px 1px 0px var\(--border-default\);\s*\}/g, `.btnAction:hover {
  background: var(--border-light);
}`);

  content = content.replace(/\.btnPrimary \{[\s\S]*?\}/g, `.btnPrimary {
  background: var(--brand-green);
  border-color: var(--brand-green);
  color: white;
}
.btnPrimary:hover {
  background: #059669;
  border-color: #059669;
}`);

  // Replace Table Wrapper
  content = content.replace(/\.tableWrapper \{[\s\S]*?box-shadow: 4px 4px 0px var\(--border-default\);[\s\S]*?\}/g, `.tableWrapper {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}`);

  // Replace Table Header
  content = content.replace(/\.table th \{[\s\S]*?background: rgba\(0,0,0,0\.02\);\s*\}/g, `.table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-app);
}`);

  // Remove Mono Fonts across the board
  content = content.replace(/font-family: var\(--font-mono\);\n/g, '');
  content = content.replace(/font-family: var\(--font-mono\);/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
