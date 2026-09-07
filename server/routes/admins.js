const express = require('express');
const Admin = require('../models/Admin');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const q = req.query.search;
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
            { role: new RegExp(q, 'i') }
          ]
        }
      : {};
    const admins = await Admin.find(filter).sort({ createdAt: -1 });
    res.json(admins.map((a) => a.toJSON()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.create(req.body);
    await Activity.create({
      admin: req.admin.name,
      action: `Added admin ${admin.name}`,
      type: 'admin'
    });
    res.status(201).json(admin.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    ['name', 'email', 'role', 'status'].forEach((k) => {
      if (req.body[k] !== undefined) admin[k] = req.body[k];
    });
    if (req.body.password) admin.password = req.body.password;
    await admin.save();
    await Activity.create({
      admin: req.admin.name,
      action: `Updated admin ${admin.name}`,
      type: 'admin'
    });
    res.json(admin.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.admin._id.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    await Activity.create({
      admin: req.admin.name,
      action: `Removed admin ${admin.name}`,
      type: 'admin'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
