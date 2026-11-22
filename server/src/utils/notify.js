// Email (nodemailer) + SMS (Twilio). Both fall back to console logging when not configured,
// so the app works out of the box in development.
const nodemailer = require('nodemailer');

let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}
let sms = null;
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) sms = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendEmail(to, subject, text) {
  if (!to) return;
  try {
    if (!mailer) return console.log(`[email -> ${to}] ${subject}\n${text}\n`);
    await mailer.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
  } catch (e) { console.error('Email failed:', e.message); }
}

async function sendSMS(to, body) {
  if (!to) return;
  try {
    if (!sms) return console.log(`[sms -> ${to}] ${body}`);
    await sms.messages.create({ from: process.env.TWILIO_FROM, to, body });
  } catch (e) { console.error('SMS failed:', e.message); }
}

// Notify a person (user or visitor doc) on both channels
exports.notify = async (person, subject, text) => {
  if (!person) return;
  await Promise.all([sendEmail(person.email, subject, text), sendSMS(person.phone, `${subject}: ${text}`.slice(0, 300))]);
};
