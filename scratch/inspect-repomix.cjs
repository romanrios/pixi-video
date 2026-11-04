const fs = require('fs');
const content = fs.readFileSync('C:/Users/mtess/.gemini/antigravity/brain/c4b42c9c-ac6f-4849-ae20-715c48b0ffb0/.user_uploaded/media_1793801903176_50fb8a6c.xml', 'utf8');

const fileRegex = /<file path="([^"]+)">/g;
let match;
const files = [];
while ((match = fileRegex.exec(content)) !== null) {
  files.push(match[1]);
}
console.log('Total files in repomix:', files.length);
console.log('Sample files:', files.slice(0, 15));
const appFiles = files.filter(f => !f.startsWith('examples/'));
console.log('Non-example files:', appFiles);

