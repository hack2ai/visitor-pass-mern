const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'security', 'employee', 'visitor'], default: 'visitor' },
  department: String,
  active: { type: Boolean, default: true },
}, { timestamps: true }));

const Visitor = model('Visitor', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: String,
  company: String,
  photo: String,
  user: ref('User'), // set when the visitor has a login
}, { timestamps: true }));

const Appointment = model('Appointment', new Schema({
  visitor: { ...ref('Visitor'), required: true },
  host: { ...ref('User'), required: true },
  purpose: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  location: { type: String, default: 'Main Office' }, // multi-location (bonus)
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
  createdBy: ref('User'),
  pass: ref('Pass'),
}, { timestamps: true }));

const Pass = model('Pass', new Schema({
  appointment: ref('Appointment'),
  visitor: ref('Visitor'),
  code: { type: String, unique: true, index: true },
  qr: String, // data URL
  validFrom: Date,
  validTo: Date,
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
}, { timestamps: true }));

const CheckLog = model('CheckLog', new Schema({
  pass: ref('Pass'), visitor: ref('Visitor'), appointment: ref('Appointment'),
  type: { type: String, enum: ['in', 'out'], required: true },
  at: { type: Date, default: Date.now, index: true },
  by: ref('User'), location: String,
}));

const AuditLog = model('AuditLog', new Schema({
  user: ref('User'), action: String, entity: String, meta: Schema.Types.Mixed,
  at: { type: Date, default: Date.now },
}));

module.exports = { User, Visitor, Appointment, Pass, CheckLog, AuditLog };
