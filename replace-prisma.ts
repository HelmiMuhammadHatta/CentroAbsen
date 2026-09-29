import fs from 'fs';
import path from 'path';

function walk(dir: string) {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') && !file.endsWith('prisma.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(process.cwd(), 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('const prisma = new PrismaClient()')) {
    // Let's replace PrismaClient instantiation
    content = content.replace(/const prisma = new PrismaClient\(\);/g, '');
    
    // We need to import it properly. Count the depth to `utils`
    const depth = file.split(path.sep).length - path.join(process.cwd(), 'src').split(path.sep).length;
    const relativePath = Array(depth - 1).fill('..').join('/') || '.';
    const importPath = `${relativePath}/utils/prisma`.replace(/^\.\/\.\./, '..');
    
    content = `import { prisma } from '${importPath}';\n` + content;
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
