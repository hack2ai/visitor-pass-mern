const crypto = require('crypto');
const QRCode = require('qrcode');
const { Pass, AuditLog } = require('../models');

exports.audit = (user, action, entity, meta) =>
  AuditLog.create({ user: user?._id, action, entity, meta }).catch(() => {});

// Issues one QR pass per approved appointment, valid for the whole appointment day.
exports.issuePass = async (appt) => {
  let pass = await Pass.findOne({ appointment: appt._id, status: 'active' });
  if (pass) return pass;
  const code = crypto.randomBytes(12).toString('hex');
  const from = new Date(appt.scheduledAt); from.setHours(0, 0, 0, 0);
  const to = new Date(appt.scheduledAt); to.setHours(23, 59, 59, 999);
  pass = await Pass.create({
    appointment: appt._id, visitor: appt.visitor, code,
    qr: await QRCode.toDataURL(code, { margin: 1, width: 300 }),
    validFrom: from, validTo: to,
  });
  appt.pass = pass._id;
  await appt.save();
  return pass;
};

exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
