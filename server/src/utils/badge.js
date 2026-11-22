const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Streams a printable visitor badge (PDF) to the response
module.exports = (pass, res) => {
  const { visitor, appointment: a } = pass;
  const doc = new PDFDocument({ size: [300, 440], margin: 20 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pass-${pass.code.slice(0, 8)}.pdf"`);
  doc.pipe(res);

  doc.rect(0, 0, 300, 70).fill('#0F4C5C');
  doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('VISITOR', 20, 24);
  doc.rect(0, 70, 300, 6).fill('#F2A900');

  let y = 92;
  const photo = visitor.photo && path.join(__dirname, '../..', visitor.photo);
  if (photo && fs.existsSync(photo)) {
    try { doc.image(photo, 20, y, { fit: [70, 80] }); } catch {}
  }
  doc.fillColor('#1E2A32').font('Helvetica-Bold').fontSize(16).text(visitor.name, 100, y, { width: 180 });
  doc.font('Helvetica').fontSize(10).fillColor('#55636d').text(visitor.company || '', 100, doc.y + 2, { width: 180 });

  y = 190;
  const row = (label, value) => {
    doc.font('Helvetica').fontSize(8).fillColor('#55636d').text(label, 20, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E2A32').text(value || '-', 20, y + 10, { width: 260 });
    y += 36;
  };
  row('Visiting', a.host?.name);
  row('Date', new Date(a.scheduledAt).toLocaleString());
  row('Location', a.location);

  const qr = Buffer.from(pass.qr.split(',')[1], 'base64');
  doc.image(qr, 150, 300, { width: 130 });
  doc.font('Helvetica').fontSize(7).fillColor('#55636d').text(pass.code, 20, 410, { width: 260 });
  doc.end();
};
