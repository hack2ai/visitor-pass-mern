const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Visitor } = require('../models');
const { auth } = require('../middleware/auth');
const { audit } = require('../utils/helpers');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });

// Visitor self-registration (staff accounts are created by an admin)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const user = await User.create({ name, email, phone, role: 'visitor', password: await bcrypt.hash(password, 10) });
  await Visitor.findOneAndUpdate({ email: user.email }, { name, phone, company, user: user._id }, { upsert: true, new: true });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !user.active || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ message: 'Email or password is incorrect' });
  audit(user, 'login', 'User', { id: user._id });
  res.json({ token: sign(user), user: pub(user) });
});

router.get('/me', auth, (req, res) => res.json({ user: pub(req.user) }));

module.exports = router;
