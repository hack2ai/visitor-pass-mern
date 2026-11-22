const router = require('express').Router();
const { Pass, Visitor } = require('../models');
const { auth, allow } = require('../middleware/auth');
const { audit } = require('../utils/helpers');
const badge = require('../utils/badge');

router.use(auth);
const full = (q) => q.populate('visitor').populate({ path: 'appointment', populate: { path: 'host', select: 'name department' } });

async function canView(user, pass) {
  if (user.role === 'visitor') {
    const v = await Visitor.findOne({ user: user._id });
    return v && String(pass.visitor._id || pass.visitor) === String(v._id);
  }
  if (user.role === 'employee') return String(pass.appointment.host._id || pass.appointment.host) === String(user._id);
  return true;
}

router.get('/mine', allow('visitor'), async (req, res) => {
  const v = await Visitor.findOne({ user: req.user._id });
  res.json(await full(Pass.find({ visitor: v?._id }).sort('-createdAt')));
});

router.get('/:id', async (req, res) => {
  const pass = await full(Pass.findById(req.params.id));
  if (!pass || !(await canView(req.user, pass))) return res.status(404).json({ message: 'Pass not found' });
  res.json(pass);
});

router.get('/:id/pdf', async (req, res) => {
  const pass = await full(Pass.findById(req.params.id));
  if (!pass || !(await canView(req.user, pass))) return res.status(404).json({ message: 'Pass not found' });
  badge(pass, res);
});

router.patch('/:id/revoke', allow('admin', 'security'), async (req, res) => {
  const p = await Pass.findByIdAndUpdate(req.params.id, { status: 'revoked' }, { new: true });
  audit(req.user, 'revoke', 'Pass', { id: req.params.id });
  res.json(p);
});

module.exports = router;
