import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });

let css = fs.readFileSync(path.join(root, 'css/sic.css'), 'utf8');
css = css.replace(/url\('\.\.\/assets\/fonts\/([^']+)'\)/g, function (_m, name) {
  const buf = fs.readFileSync(path.join(root, 'assets/fonts', name));
  return "url('data:font/woff2;base64," + buf.toString('base64') + "')";
});
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const art = {};
const skinDir = path.join(root, 'assets/skins');
if (fs.existsSync(skinDir)) {
  for (const slug of fs.readdirSync(skinDir)) {
    const dir = path.join(skinDir, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.webp')) continue;
      const buf = fs.readFileSync(path.join(dir, file));
      art[slug + '/' + file] = 'data:image/webp;base64,' + buf.toString('base64');
    }
  }
}
html = html.replace('<link rel="stylesheet" href="css/sic.css">', '<style>\n' + css + '\n</style>');
html = html.replace('</head>', '<script>window.SIC_ART=' + JSON.stringify(art) + '</script>\n</head>');
for (const name of ['sic-config', 'sic-data', 'sic-logic', 'sic-fx', 'sic-app']) {
  const js = fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8');
  if (js.includes('</script>')) throw new Error(name + ' contains a closing script tag');
  html = html.replace('<script src="js/' + name + '.js"></script>', '<script>\n' + js + '\n</script>');
}
const single = path.join(outDir, 'strength-in-character-1.2.0.html');
fs.writeFileSync(single, html);
const zip = path.join(outDir, 'strength-in-character-1.2.0-web.zip');
if (fs.existsSync(zip)) fs.unlinkSync(zip);
execFileSync('zip', ['-r', zip, 'index.html', 'css', 'js', 'assets', 'README.md', 'INSTALL.md', 'CHANGELOG.md'], { cwd: root, stdio: 'inherit' });
if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) throw new Error('single file still references Google Fonts');
console.log(single);
console.log('inlined art files', Object.keys(art).length, 'html bytes', html.length);
console.log(zip);
