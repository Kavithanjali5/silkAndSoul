# Silk & Soul — MongoDB Setup

## Requirements
- Node.js 18+
- MongoDB running locally (or Atlas URI in `.env`)

## Setup
```bash
npm install
# Edit .env if needed (MONGODB_URI)
npm start
```

Open http://localhost:5000

Admin: http://localhost:5000/admin/  
Bootstrap login (only if no admins in DB): `admin@silkandsoul.com` / `admin123`

## Notes
- All products, users, payments, admins, and activity are stored in MongoDB (`silkandsoul` database).
- No demo product/payment/user seed data — add everything from Admin Inventory / Users / Payments.
- Cart & wishlist remain browser-local for guests.
