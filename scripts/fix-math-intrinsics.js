#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const pkgDir = path.join(process.cwd(), 'node_modules', 'math-intrinsics');

if (!fs.existsSync(pkgDir)) {
  process.exit(0);
}

const shims = {
  'floor.js': "'use strict';\n\n/** @type {import('./floor')} */\nmodule.exports = Math.floor;\n",
  'max.js': "'use strict';\n\nmodule.exports = Math.max;\n",
  'min.js': "'use strict';\n\nmodule.exports = Math.min;\n",
  'round.js': "'use strict';\n\n/** @type {import('./round')} */\nmodule.exports = Math.round;\n",
  'isInteger.js':
    "'use strict';\n\n/** @type {import('./isInteger')} */\nmodule.exports = Math.isInteger || function isInteger(value) {\n  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;\n};\n",
};

let wroteAny = false;

for (const [fileName, contents] of Object.entries(shims)) {
  const filePath = path.join(pkgDir, fileName);
  if (fs.existsSync(filePath)) {
    continue;
  }

  fs.writeFileSync(filePath, contents);
  wroteAny = true;
}

if (wroteAny) {
  console.log('Patched missing math-intrinsics files');
}
