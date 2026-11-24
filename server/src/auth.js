import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models.js';

const secret = () => process.env.JWT_SECRET || 'dev-secret';
const sign = (user) => jwt.sign({ sub: user.id, email: user.email }, secret(), { expiresIn: '7d' });

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), email: user.email });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === 'string' && await User.findOne({ email: email.toLowerCase() });
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: sign(user), email: user.email });
});
