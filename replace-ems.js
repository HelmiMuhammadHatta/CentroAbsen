const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('apps/web/src');
files.push('apps/web/index.html');
files.push('apps/web/package.json');

files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      let changed = false;
      if (content.includes('EMS Portal')) { content = content.replace(/EMS Portal/g, 'CentroAbsen'); changed = true; }
      if (content.includes('EMS Assessment')) { content = content.replace(/EMS Assessment/g, 'CentroAbsen'); changed = true; }
      if (content.includes('EMS Career')) { content = content.replace(/EMS Career/g, 'CentroAbsen'); changed = true; }
      if (content.includes('ekosistem EMS')) { content = content.replace(/ekosistem EMS/g, 'ekosistem CentroAbsen'); changed = true; }
      if (content.includes('EMS Design System')) { content = content.replace(/EMS Design System/g, 'CentroAbsen Design System'); changed = true; }
      if (content.includes('Employee Management System')) { content = content.replace(/Employee Management System/g, 'CentroAbsen'); changed = true; }
      
      if (changed) {
          fs.writeFileSync(file, content, 'utf8');
          console.log('Updated', file);
      }
    } catch (e) {
      // ignore
    }
});
