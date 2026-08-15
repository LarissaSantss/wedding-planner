const fs = require('fs');
const c = fs.readFileSync('src/components/dashboard/EventView.tsx', 'utf8');
const fixed = c.replace(/<\/arg_value>/g, '');
fs.writeFileSync('src/components/dashboard/EventView.tsx', fixed);
console.log('Fixed: removed arg_value tags');