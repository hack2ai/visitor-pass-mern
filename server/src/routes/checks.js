const router = require('express').Router();
const { Pass, CheckLog, Appointment } = require('../models');
const { auth, allow } = require('../middleware/auth');
const { audit } = require('../utils/helpers');
const { notify } = require('../utils/notify');

router.use(auth, allow('security', 'admin'));

// Scanning a QR toggles the visitor between checked in and checked out
router.post('/scan', async (req, res) => {
  const code = (req.body.code || '').trim();
  const pass = await Pass.findOne({ code }).populate('visitor').populate({ path: 'appointment', populate: { path: 'host' } });
  if (!pass) return res.status(404).json({ message: 'Unknown pass. Check the code and try again' });
  const now = new Date();
  if (pass.status !== 'active') return res.status(400).json({ message: 'This pass has been revoked' });
  if (pass.appointment.status === 'cancelled') return res.status(400).json({ message: 'This visit was cancelled' });
  if (now < pass.validFrom || now > pass.validTo) return res.status(400).json({ message: 'This pass is not valid today' });

  const last = await CheckLog.findOne({ pass: pass._id }).sort('-at');
  const type = !last || last.type === 'out' ? 'in' : 'out';
  const log = await CheckLog.create({
    pass: pass._id, visitor: pass.visitor._id, appointment: pass.appointment._id,
    type, by: req.user._id, location: pass.appointment.location,
  });
  if (type === 'out') await Appointment.findByIdAndUpdate(pass.appointment._id, { status: 'completed' });
  if (type === 'in') notify(pass.appointment.host, 'Your visitor has arrived', `${pass.visitor.name} just checked in at ${pass.appointment.location}.`);
  audit(req.user, 'check-' + type, 'Pass', { id: pass._id });
  res.json({ type, at: log.at, visitor: pass.visitor, host: pass.appointment.host.name, purpose: pass.appointment.purpose });
});

module.exports = router;
