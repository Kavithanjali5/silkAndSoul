const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.method) filter.method = req.query.method;
    if (req.query.search) {
      filter.$or = [
        { paymentId: new RegExp(req.query.search, 'i') },
        { orderId: new RegExp(req.query.search, 'i') },
        { userName: new RegExp(req.query.search, 'i') },
        { product: new RegExp(req.query.search, 'i') }
      ];
    }
    const payments = await Payment.find(filter).sort({ date: -1 });
    res.json(payments.map((p) => p.toJSON()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    let userName = req.body.userName;
    if (req.body.userId) {
      const user = await User.findById(req.body.userId);
      if (user) userName = user.name;
    }
    const payment = await Payment.create({ ...req.body, userName });
    await Activity.create({
      admin: req.admin.name,
      action: `Recorded payment ${payment.paymentId}`,
      type: 'payment'
    });
    res.status(201).json(payment.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const payment =
      (await Payment.findOne({ paymentId: req.params.id })) ||
      (await Payment.findById(req.params.id));
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (req.body.userId) {
      const user = await User.findById(req.body.userId);
      if (user) {
        payment.userId = user._id;
        payment.userName = user.name;
      }
    }
    ['product', 'amount', 'method', 'status'].forEach((k) => {
      if (req.body[k] !== undefined) payment[k] = req.body[k];
    });
    await payment.save();
    await Activity.create({
      admin: req.admin.name,
      action: `Updated payment ${payment.paymentId}`,
      type: 'payment'
    });
    res.json(payment.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const payment =
      (await Payment.findOne({ paymentId: req.params.id })) ||
      (await Payment.findById(req.params.id));
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    payment.status = req.body.status;
    await payment.save();
    await Activity.create({
      admin: req.admin.name,
      action: `Marked ${payment.paymentId} as ${payment.status}`,
      type: 'payment'
    });
    res.json(payment.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const payment =
      (await Payment.findOneAndDelete({ paymentId: req.params.id })) ||
      (await Payment.findByIdAndDelete(req.params.id));
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    await Activity.create({
      admin: req.admin.name,
      action: `Deleted payment ${payment.paymentId}`,
      type: 'payment'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
