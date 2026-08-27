// tinyshop — fixture app. A gmax install must never modify this file.
const items = [
  { id: 1, name: 'pen', price: 120 },
  { id: 2, name: 'notebook', price: 350 },
];

function total() {
  return items.reduce((sum, i) => sum + i.price, 0);
}

module.exports = { items, total };
