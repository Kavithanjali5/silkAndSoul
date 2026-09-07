const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const [products, users, payments, activity] = await Promise.all([
      Product.find(),
      User.find(),
      Payment.find().sort({ date: -1 }),
      Activity.find().sort({ time: -1 }).limit(20)
    ]);

    const completed = payments.filter((p) => p.status === 'completed');
    const revenue = completed.reduce((s, p) => s + p.amount, 0);
    const lowStock = products.filter(
      (p) => p.status === 'low_stock' || p.status === 'out_of_stock'
    ).length;

    res.json({
      revenue,
      productCount: products.length,
      lowStock,
      userCount: users.length,
      activeUsers: users.filter((u) => u.status === 'active').length,
      pendingPayments: payments.filter(
        (p) => p.status === 'pending' || p.status === 'processing'
      ).length,
      payments: payments.map((p) => p.toJSON()),
      products: products.map((p) => p.toJSON()),
      users: users.map((u) => u.toJSON()),
      activity: activity.map((a) => a.toJSON())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity', requireAuth, async (_req, res) => {
  try {
    const activity = await Activity.find().sort({ time: -1 }).limit(50);
    res.json(activity.map((a) => a.toJSON()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
