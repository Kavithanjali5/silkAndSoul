const express = require('express');
const Admin = require('../models/Admin');
const Activity = require('../models/Activity');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const admin = await Admin.findOne({ email, status: 'active' });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    admin.lastLogin = new Date();
    await admin.save();
    await Activity.create({ admin: admin.name, action: 'Signed in to admin panel', type: 'admin' });
    const token = signToken(admin);
    res.json({ token, admin: admin.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.admin.toJSON());
});

module.exports = router;
