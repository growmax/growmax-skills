'use strict';

// Single source of truth for allowed status transitions per document type.
// A transition is legal only if the target status is listed for the current
// status. Terminal states have an empty array.

const QUOTE_TRANSITIONS = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED'],
  ACCEPTED: ['CONVERTED'],
  CONVERTED: [],
};

const ORDER_TRANSITIONS = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['FULFILLED'],
  FULFILLED: [],
};

const INVOICE_TRANSITIONS = {
  UNPAID: ['PARTIALLY_PAID', 'PAID'],
  PARTIALLY_PAID: ['PARTIALLY_PAID', 'PAID'],
  PAID: [],
};

const MACHINES = {
  quote: QUOTE_TRANSITIONS,
  order: ORDER_TRANSITIONS,
  invoice: INVOICE_TRANSITIONS,
};

// Returns true if `from -> to` is an allowed transition for the given doc type.
function canTransition(docType, from, to) {
  const machine = MACHINES[docType];
  if (!machine) return false;
  const allowed = machine[from] || [];
  return allowed.includes(to);
}

module.exports = {
  QUOTE_TRANSITIONS,
  ORDER_TRANSITIONS,
  INVOICE_TRANSITIONS,
  MACHINES,
  canTransition,
};
