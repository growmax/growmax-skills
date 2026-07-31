// Payments screen: two cards, titles from the locale bundle.
// Deliberately trivial — the planted defect is in the COPY, not in any computation here.
const { labelFor } = require('./labels');

function cards() {
  return [
    { key: 'payments.collected', title: labelFor('payments.collected.title'), count: 2 },
    { key: 'payments.pending', title: labelFor('payments.pending.title'), count: 1 },
  ];
}

module.exports = { cards };
