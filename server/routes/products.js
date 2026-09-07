const express = require('express');
const Product = require('../models/Product');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { sku: new RegExp(req.query.search, 'i') }
      ];
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products.map((p) => p.toJSON()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product.toJSON());
  } catch {
    res.status(404).json({ error: 'Product not found' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await Activity.create({
      admin: req.admin.name,
      action: `Added product: ${product.name}`,
      type: 'inventory'
    });
    res.status(201).json(product.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    Object.assign(product, req.body);
    await product.save();
    await Activity.create({
      admin: req.admin.name,
      action: `Updated inventory: ${product.name}`,
      type: 'inventory'
    });
    res.json(product.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/stock', requireAuth, async (req, res) => {
  try {
    const delta = Number(req.body.delta) || 0;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.stock = Math.max(0, product.stock + delta);
    await product.save();
    await Activity.create({
      admin: req.admin.name,
      action: `Adjusted stock for ${product.name} (${delta > 0 ? '+' : ''}${delta})`,
      type: 'inventory'
    });
    res.json(product.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await Activity.create({
      admin: req.admin.name,
      action: `Deleted product: ${product.name}`,
      type: 'inventory'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
