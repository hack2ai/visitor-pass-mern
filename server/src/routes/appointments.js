const router = require('express').Router();
const { User, Visitor, Appointment } = require('../models');
const { auth, allow } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { issuePass, audit } = require('../utils/helpers');
const { notify } = require('../utils/notify');

router.use(auth);
const populate = (q) => q.populate('visitor', 'name email phone company photo').populate('host', 'name department');

// Visitor pre-registers a visit -> waits for host approval
router.post('/', allow('visitor'), upload.single('photo'), async (req, res) => {
  const { hostId, purpose, scheduledAt, location } = req.body;
  if (!hostId || !purpose || !scheduledAt) return res.status(400).json({ message: 'Host, purpose and date are required' });
  if (new Date(scheduledAt) < new Date(Date.now() - 3600e3)) return res.status(400).json({ message: 'Pick a date in the future' });
  const host = await User.findOne({ _id: hostId, role: 'employee', active: true });
  if (!host) return res.status(400).json({ message: 'Host not found' });
  const visitor = await Visitor.findOne({ user: req.user._id });
  if (req.file) { visitor.photo = '/uploads/' + req.file.filename; await visitor.save(); }
  const appt = await Appointment.create({ visitor: visitor._id, host: host._id, purpose, scheduledAt, location: location || undefined, createdBy: req.user._id });
  notify(host, 'New visit request', `${visitor.name} asks to visit you on ${new Date(scheduledAt).toLocaleString()} (${purpose}). Open Visitor Pass to approve.`);
  audit(req.user, 'create', 'Appointment', { id: appt._id });
  res.status(201).json(appt);
});

// Host invites a visitor, or front desk registers a walk-in -> approved with pass immediately
router.post('/invite', allow('employee', 'security', 'admin'), upload.single('photo'), async (req, res) => {
  const { name, email, phone, company, purpose, scheduledAt, location } = req.body;
  const hostId = req.user.role === 'employee' ? req.user._id : req.body.hostId;
  if (!name || !email || !purpose || !hostId) return res.status(400).json({ message: 'Name, email, purpose and host are required' });
  const host = await User.findOne({ _id: hostId, role: 'employee', active: true });
  if (!host) return res.status(400).json({ message: 'Host not found' });
  let visitor = await Visitor.findOne({ email: email.toLowerCase() });
  if (!visitor) visitor = new Visitor({ email });
  Object.assign(visitor, { name, phone: phone || visitor.phone, company: company || visitor.company });
  if (req.file) visitor.photo = '/uploads/' + req.file.filename;
  await visitor.save();
  const appt = await Appointment.create({
    visitor: visitor._id, host: host._id, purpose, scheduledAt: scheduledAt || new Date(),
    location: location || undefined, status: 'approved', createdBy: req.user._id,
  });
  await issuePass(appt);
  notify(visitor, 'Your visitor pass is ready', `You are invited by ${host.name} on ${new Date(appt.scheduledAt).toLocaleString()}. Show the QR code from your pass at reception: ${process.env.CLIENT_URL}/passes`);
  audit(req.user, 'invite', 'Appointment', { id: appt._id });
  res.status(201).json(appt);
});

router.get('/', async (req, res) => {
  const f = {};
  if (req.user.role === 'visitor') {
    const v = await Visitor.findOne({ user: req.user._id });
    f.visitor = v?._id;
  } else if (req.user.role === 'employee') f.host = req.user._id;
  if (req.query.status) f.status = req.query.status;
  res.json(await populate(Appointment.find(f).sort('-scheduledAt').limit(200)));
});

// Host (or admin) approves / rejects
router.patch('/:id/status', allow('employee', 'admin'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status must be approved or rejected' });
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (req.user.role === 'employee' && String(appt.host) !== String(req.user._id)) return res.status(403).json({ message: 'This visit is for another host' });
  if (appt.status !== 'pending') return res.status(400).json({ message: `Already ${appt.status}` });
  appt.status = status;
  await appt.save();
  if (status === 'approved') await issuePass(appt);
  const visitor = await Visitor.findById(appt.visitor);
  notify(visitor, `Visit ${status}`, status === 'approved'
    ? `Your visit on ${appt.scheduledAt.toLocaleString()} is approved. Your pass: ${process.env.CLIENT_URL}/passes`
    : `Your visit request for ${appt.scheduledAt.toLocaleString()} was declined.`);
  audit(req.user, status, 'Appointment', { id: appt._id });
  res.json(await populate(Appointment.findById(appt._id)));
});

router.patch('/:id/cancel', allow('visitor'), async (req, res) => {
  const v = await Visitor.findOne({ user: req.user._id });
  const appt = await Appointment.findOne({ _id: req.params.id, visitor: v?._id });
  if (!appt || !['pending', 'approved'].includes(appt.status)) return res.status(400).json({ message: 'This visit cannot be cancelled' });
  appt.status = 'cancelled';
  await appt.save();
  if (appt.pass) await require('../models').Pass.findByIdAndUpdate(appt.pass, { status: 'revoked' });
  audit(req.user, 'cancel', 'Appointment', { id: appt._id });
  res.json(appt);
});

module.exports = router;
