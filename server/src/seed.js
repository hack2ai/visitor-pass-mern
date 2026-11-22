// Demo data: node src/seed.js   (all passwords: password123)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Visitor, Appointment, Pass, CheckLog, AuditLog } = require('./models');
const { issuePass } = require('./utils/helpers');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Visitor, Appointment, Pass, CheckLog, AuditLog].map((m) => m.deleteMany({})));
  const password = await bcrypt.hash('password123', 10);
  const [admin, guard, priya, rahul, vis] = await User.create([
    { name: 'Asha Admin', email: 'admin@demo.com', role: 'admin', password },
    { name: 'Sam Security', email: 'security@demo.com', role: 'security', password },
    { name: 'Priya Sharma', email: 'priya@demo.com', role: 'employee', department: 'Engineering', password },
    { name: 'Rahul Mehta', email: 'rahul@demo.com', role: 'employee', department: 'HR', password },
    { name: 'Vera Visitor', email: 'visitor@demo.com', role: 'visitor', password },
  ]);
  const [vera, tom, lina, omar] = await Visitor.create([
    { name: 'Vera Visitor', email: 'visitor@demo.com', phone: '+911111111111', company: 'Acme Ltd', user: vis._id },
    { name: 'Tom Baker', email: 'tom@acme.com', company: 'Acme Ltd' },
    { name: 'Lina Park', email: 'lina@globex.com', company: 'Globex' },
    { name: 'Omar Haddad', email: 'omar@initech.com', company: 'Initech' },
  ]);
  const day = (offset, h = 10) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, 0, 0, 0); return d; };
  const mk = (visitor, host, purpose, when, status, location = 'Main Office') =>
    Appointment.create({ visitor: visitor._id, host: host._id, purpose, scheduledAt: when, status, location, createdBy: admin._id });

  const today = await mk(tom, priya, 'Project demo', day(0), 'approved');
  const todayPass = await issuePass(today);
  const today2 = await mk(lina, rahul, 'Interview', day(0, 14), 'approved', 'Annex Building');
  await issuePass(today2);
  await mk(vera, priya, 'Vendor meeting', day(1), 'pending');
  await mk(omar, rahul, 'Contract signing', day(2), 'pending');

  // History for the dashboard chart
  for (let i = 1; i <= 6; i++) {
    const a = await mk([tom, lina, omar][i % 3], [priya, rahul][i % 2], 'Past visit', day(-i), 'completed');
    const p = await issuePass(a);
    for (let n = 0; n < (i % 3) + 1; n++) {
      await CheckLog.create({ pass: p._id, visitor: a.visitor, appointment: a._id, type: 'in', at: day(-i, 9 + n), by: guard._id, location: a.location });
      await CheckLog.create({ pass: p._id, visitor: a.visitor, appointment: a._id, type: 'out', at: day(-i, 10 + n), by: guard._id, location: a.location });
    }
  }
  console.log('Seeded. Log in with admin@demo.com / security@demo.com / priya@demo.com / visitor@demo.com (password123)');
  console.log('Sample pass code for today:', todayPass.code);
  process.exit(0);
})();
