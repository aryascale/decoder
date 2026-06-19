const fs = require('fs');
const file = 'src/lib/email-service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const labelMap = new Map(fieldDefs.map((f: any) => [f.id, f.label]));",
  "const labelMap = new Map(fieldDefs.map((f: any) => [f.id.toLowerCase(), f.label]));"
);

code = code.replace(
  "const label = labelMap.get(key) || key.replace(/([A-Z])/g, ' $1').trim();",
  "const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key);\n                          const label = labelMap.get(key.toLowerCase()) || (isUUID ? 'Info' : key.replace(/([A-Z])/g, ' $1').trim());"
);

fs.writeFileSync(file, code);
console.log('Patched email-service.ts');
