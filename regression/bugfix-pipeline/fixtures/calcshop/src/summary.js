const data = require('../data/rows.json');

// Team summary page: revenue per rep, shown to admins.
function repRevenue(tenant, repId, from, to) {
  return data.orders
    .filter((o) => o.tenant === tenant && o.repId === repId && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.amount, 0);
}

module.exports = { repRevenue };
