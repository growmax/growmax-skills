const data = require('../data/rows.json');

// A rep's own dashboard: their invoiced revenue for the selected window.
function repRevenue(tenant, repId, from, to) {
  return data.invoices
    .filter(
      (i) =>
        i.tenant === tenant &&
        i.repId === repId &&
        !['DRAFT', 'CANCELLED', 'VOIDED'].includes(i.status) &&
        i.invoiceDate >= from &&
        i.invoiceDate <= to,
    )
    .reduce((sum, i) => sum + i.amount, 0);
}

module.exports = { repRevenue };
