const router = require('express').Router();
const { CheckLog, Visitor, Appointment, AuditLog } = require('../models');
const { auth, allow } = require('../middleware/auth');
const { escapeRegex } = require('../utils/helpers');

router.use(auth, allow('admin', 'security'));

router.get('/summary', async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const week = new Date(start); week.setDate(week.getDate() - 6);
  const [inside, today, pending, totalVisitors, perDay, topHosts] = await Promise.all([
    CheckLog.aggregate([{ $sort: { at: -1 } }, { $group: { _id: '$pass', type: { $first: '$type' } } }, { $match: { type: 'in' } }, { $count: 'n' }]),
    CheckLog.countDocuments({ type: 'in', at: { $gte: start } }),
    Appointment.countDocuments({ status: 'pending' }),
    Visitor.countDocuments(),
    CheckLog.aggregate([{ $match: { type: 'in', at: { $gte: week } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Appointment.aggregate([{ $group: { _id: '$host', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'h' } }, { $project: { name: { $arrayElemAt: ['$h.name', 0] }, count: 1 } }]),
  ]);
  res.json({ inside: inside[0]?.n || 0, today, pending, totalVisitors, perDay, topHosts });
});

async function buildFilter(q) {
  const f = {};
  if (q.type) f.type = q.type;
  if (q.from || q.to) {
    f.at = {};
    if (q.from) f.at.$gte = new Date(q.from);
    if (q.to) { const t = new Date(q.to); t.setHours(23, 59, 59, 999); f.at.$lte = t; }
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const vs = await Visitor.find({ $or: [{ name: rx }, { email: rx }, { company: rx }] }).select('_id');
    f.visitor = { $in: vs.map((v) => v._id) };
  }
  return f;
}
const query = (f) => CheckLog.find(f).sort('-at').limit(1000)
  .populate('visitor', 'name email company')
  .populate({ path: 'appointment', select: 'purpose host location', populate: { path: 'host', select: 'name' } });

router.get('/logs', async (req, res) => res.json(await query(await buildFilter(req.query))));

router.get('/export', async (req, res) => {
  const logs = await query(await buildFilter(req.query));
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['Time', 'Type', 'Visitor', 'Email', 'Company', 'Host', 'Purpose', 'Location'].join(',')];
  logs.forEach((l) => rows.push([l.at.toISOString(), l.type, l.visitor?.name, l.visitor?.email, l.visitor?.company,
    l.appointment?.host?.name, l.appointment?.purpose, l.appointment?.location].map(esc).join(',')));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="visitor-logs.csv"');
  res.send(rows.join('\n'));
});

router.get('/audit', allow('admin'), async (req, res) => {
  res.json(await AuditLog.find().sort('-at').limit(200).populate('user', 'name role'));
});

module.exports = router;
