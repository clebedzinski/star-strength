import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

const css = fs.readFileSync(path.join(root, 'css/sic.css'), 'utf8');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="css/sic.css">', '<style>\n' + css + '\n</style>');
for (const name of ['sic-config', 'sic-data', 'sic-logic', 'sic-fx', 'sic-app']) {
  const js = fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8');
  if (js.includes('</script>')) throw new Error(name + ' contains a closing script tag');
  html = html.replace('<script src="js/' + name + '.js"></script>', '<script>\n' + js + '\n</script>');
}
const single = path.join(outDir, 'sic.html');
const named = path.join(outDir, 'strength-in-character-1.1.0.html');
fs.writeFileSync(single, html);
fs.writeFileSync(named, html);
const zip = path.join(outDir, 'sic-web.zip');
const namedZip = path.join(outDir, 'strength-in-character-1.1.0-web.zip');
if (fs.existsSync(zip)) fs.unlinkSync(zip);
if (fs.existsSync(namedZip)) fs.unlinkSync(namedZip);
execFileSync('zip', ['-r', zip, 'index.html', 'css', 'js', 'gas', 'README.md', 'INSTALL.md', 'CHANGELOG.md'], { cwd: root, stdio: 'inherit' });
fs.copyFileSync(zip, namedZip);
console.log(single);
console.log(named);
console.log(zip);
console.log(namedZip);
