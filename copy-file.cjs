const fs = require('fs');
const c = fs.readFileSync('eventview-content.txt', 'utf8');
const lines = c.split('\n');
const filtered = lines.filter(l => !l.includes('arg_value') && !l.includes('tool_call'));
const cleaned = filtered.join('\n');
fs.writeFileSync('src/components/dashboard/EventView.tsx', cleaned);
console.log('Done. Lines: ' + cleaned.split('\n').length);
</arg_value></tool_call>