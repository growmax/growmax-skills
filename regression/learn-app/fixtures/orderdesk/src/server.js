const express = require('express');

const authRouter = require('./routes/auth');
const catalogRouter = require('./routes/catalog');
const { router: cartRouter } = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const invoicesRouter = require('./routes/invoices');
const adminRouter = require('./routes/admin');
const reportsRouter = require('./routes/reports');

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/products', catalogRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/admin', adminRouter);

if (process.env.REPORTS_ENABLED === 'true') {
  app.use('/api/reports', reportsRouter);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OrderDesk listening on port ${PORT}`);
});

module.exports = app;
