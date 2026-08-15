const fs = require('fs');
const c = fs.readFileSync('src/components/dashboard/EventView.tsx', 'utf8');
// Remove any trailing garbage lines after the closing brace
const lines = c.split('\n');
const cleanLines = lines.filter(line => {
  // Keep lines that are part of the actual code
  return !line.includes('◞') && !line.includes('◟') && !line.includes('◡');
});
// Also remove any lines after the last closing brace
const lastBrace = cleanLines.lastIndexOf('}');
const result = cleanLines.slice(0, lastBrace + 1).join('\n') + '\n';
fs.writeFileSync('src/components/dashboard/EventView.tsx', result);
console.log('File cleaned. Lines: ' + result.split('\n').length);