require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admins');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;
const root = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: 'silkandsoul' });
});

app.get('/api/meta/categories', (_req, res) => {
  res.json([
    { id: 'all', name: 'All Sarees', image: 'attachments/d3854ad5-e75c-474c-be77-c63736462241.JPG' },
    { id: 'banarasi', name: 'Banarasi', image: 'attachments/d3854ad5-e75c-474c-be77-c63736462241.JPG' },
    { id: 'kanjeevaram', name: 'Kanjeevaram', image: 'attachments/2593f2b0-8cb8-46f0-9ee3-800c311fcf1b.JPG' },
    { id: 'silk', name: 'Silk', image: 'attachments/ea5f8825-002f-478d-9bd9-626d8cb3968e.JPG' },
    { id: 'cotton', name: 'Cotton', image: 'attachments/f4e3f845-3f5f-4bdc-944b-725ca9481c26.JPG' },
    { id: 'designer', name: 'Designer', image: 'attachments/71d27dfb-7f35-4ed8-9808-939fafa44951.JPG' }
  ]);
});

app.get('/api/meta/occasions', (_req, res) => {
  res.json([
    { id: 'wedding', name: 'Wedding' },
    { id: 'festive', name: 'Festive' },
    { id: 'party', name: 'Party' },
    { id: 'daily', name: 'Daily Wear' },
    { id: 'office', name: 'Office' }
  ]);
});

app.use(express.static(root));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.includes('.')) return next();
  res.sendFile(path.join(root, 'index.html'));
});

async function bootstrapAdmin() {
  const count = await Admin.countDocuments();
  if (count > 0) return;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@silkandsoul.com';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Admin';
  await Admin.create({
    name,
    email,
    password,
    role: 'super_admin',
    status: 'active'
  });
  console.log(`Bootstrap admin created: ${email}`);
}

async function start() {
  try {
    await connectDB();
    await bootstrapAdmin();
    app.listen(PORT, () => {
      console.log(`Silk & Soul running at http://localhost:${PORT}`);
      console.log(`Admin login: http://localhost:${PORT}/admin/`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Make sure MongoDB is running and MONGODB_URI in .env is correct.');
    process.exit(1);
  }
}

start();
