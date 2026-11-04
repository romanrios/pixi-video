const fs = require('fs');
const content = fs.readFileSync('C:/Users/mtess/.gemini/antigravity/brain/c4b42c9c-ac6f-4849-ae20-715c48b0ffb0/.user_uploaded/media_1793801903176_50fb8a6c.xml', 'utf8');

function extractFile(path) {
  const startTag = `<file path="${path}">`;
  const endTag = `</file>`;
  const start = content.indexOf(startTag);
  if (start === -1) return null;
  const end = content.indexOf(endTag, start);
  return content.substring(start + startTag.length, end);
}

console.log('=== CanvasView.tsx ===');
console.log(extractFile('playground/src/viewer/CanvasView.tsx'));

console.log('=== scene-frame-entry.ts ===');
console.log(extractFile('playground/src/scene-frame-entry.ts'));

