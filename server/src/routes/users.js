const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { auth, allow } = require('../middleware/auth');
const { audit } = require('../utils/helpers');

router.use(auth);

// Hosts a visitor can choose when pre-registering
router.get('/hosts', async (req, res) => {
  res.json(await User.find({ role: 'employee', active: true }).select('name department').sort('name'));
});

router.get('/', allow('admin'), async (req, res) => {
  res.json(await User.find().select('-password').sort('-createdAt'));
});

router.post('/', allow('admin'), async (req, res) => {
  const { name, email, password, role, phone, department } = req.body;
  if (!name || !email || !password || !['admin', 'security', 'employee'].includes(role))
    return res.status(400).json({ message: 'Name, email, password and a staff role are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const u = await User.create({ name, email, role, phone, department, password: await bcrypt.hash(password, 10) });
  audit(req.user, 'create', 'User', { id: u._id, role });
  res.status(201).json({ ...u.toObject(), password: undefined });
});

router.patch('/:id', allow('admin'), async (req, res) => {
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: 'You cannot change your own account here' });
  const { active, role } = req.body;
  const u = await User.findByIdAndUpdate(req.params.id, { ...(active !== undefined && { active }), ...(role && { role }) }, { new: true }).select('-password');
  audit(req.user, 'update', 'User', { id: req.params.id, active, role });
  res.json(u);
});

module.exports = router;
