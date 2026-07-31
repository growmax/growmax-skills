// Copy lookup. Reads the locale bundle; knows nothing about what the labels mean.
const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '..', 'locales', 'en.json');

function labelFor(key) {
  const bundle = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
  return key.split('.').reduce((node, part) => (node == null ? node : node[part]), bundle);
}

module.exports = { labelFor };
