const fs = require('fs');
const path = require('path');
const replacements = {
  'bg-white': 'glass-panel',
  'border-gray-200': 'border-border-default',
  'text-gray-900': 'text-text-primary',
  'text-slate-900': 'text-text-primary',
  'text-slate-800': 'text-text-primary',
  'text-slate-700': 'text-text-primary',
  'text-slate-600': 'text-text-secondary',
  'text-slate-500': 'text-text-secondary',
  'text-slate-400': 'text-text-muted',
  'bg-slate-50': 'bg-bg-surface',
  'bg-slate-100': 'bg-bg-surface',
  'bg-slate-200': 'bg-bg-surface',
  'border-slate-200': 'border-border-default',
  'border-slate-200/80': 'border-border-default',
  'border-slate-100': 'border-border-default',
  'bg-emerald-600': 'bg-brand-green',
  'hover:bg-emerald-700': 'hover:bg-brand-green/90',
  'text-emerald-700': 'text-brand-green',
  'text-emerald-600': 'text-brand-green',
  'text-emerald-800': 'text-brand-green',
  'bg-emerald-50': 'bg-brand-green/10',
  'bg-emerald-100': 'bg-brand-green/10',
  'border-emerald-200': 'border-brand-green/30',
  'bg-amber-600': 'bg-brand-orange text-black',
  'hover:bg-amber-700': 'hover:bg-brand-orange/90',
  'text-amber-700': 'text-brand-orange',
  'text-amber-500': 'text-brand-orange',
  'text-amber-600': 'text-brand-orange',
  'bg-amber-50': 'bg-brand-orange/10',
  'border-amber-200': 'border-brand-orange/30',
  'bg-[#efeae2]': 'bg-bg-app',
  'bg-[#0FA958]': 'bg-brand-green text-black',
  'bg-green-600': 'bg-brand-green text-black',
  'hover:bg-green-700': 'hover:bg-brand-green/90',
  'text-green-600': 'text-brand-green',
  'text-green-700': 'text-brand-green',
  'bg-green-100': 'bg-brand-green/10',
  'border-green-200': 'border-brand-green/30',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('app/dashboard');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    const regex = new RegExp(oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, newClass);
  }
  
  // also fix double glass-panel
  content = content.replace(/glass-panel\s+glass-panel/g, 'glass-panel');
  content = content.replace(/bg-bg-surface\s+glass-panel/g, 'glass-panel');
  content = content.replace(/glass-panel\s+bg-bg-surface/g, 'glass-panel');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
