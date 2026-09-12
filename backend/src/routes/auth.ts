import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool';

const router = Router();

// Demo credentials for quick SIH demo access
const DEMO_USERS = [
  { id: '33333333-0000-0000-0000-000000000001', name: 'Raju Patel', phone: '9876543001', role: 'farmer', location: 'Rajkot', district: 'Rajkot' },
  { id: '44444444-0000-0000-0000-000000000001', name: 'Gujarat Agro Traders', phone: '9876540001', role: 'buyer', location: 'Ahmedabad', district: 'Ahmedabad' }
];

function makeToken(user: any) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  try {
    // Try DB first
    const result = await query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = makeToken(user);
      return res.json({ token, user: { id: user.id, name: user.name, role: user.role, location: user.location, district: user.district } });
    }
  } catch {
    // DB unavailable — fall through to demo mode
  }

  // Demo mode fallback
  const demoUser = DEMO_USERS.find(u => u.phone === phone);
  if (demoUser && password === 'demo123') {
    const token = makeToken(demoUser);
    return res.json({ token, user: demoUser, demoMode: true });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// Demo login (one-click for SIH judges)
router.post('/demo-login', (req: Request, res: Response) => {
  const { role } = req.body;
  const demoUser = DEMO_USERS.find(u => u.role === (role || 'farmer')) || DEMO_USERS[0];
  const token = makeToken(demoUser);
  return res.json({ token, user: demoUser, demoMode: true });
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { name, phone, email, password, role, location, district } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: 'Name, phone, password, and role are required' });
  }
  if (!['farmer', 'buyer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be farmer or buyer' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, phone, email, password_hash, role, location, district)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, role, location, district`,
      [name, phone, email, hash, role, location, district]
    );
    const user = result.rows[0];
    return res.status(201).json({ token: makeToken(user), user });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone or email already registered' });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

export { router as authRouter };
