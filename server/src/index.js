require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { dir: uploadDir } = require('./middleware/upload');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/passes', require('./routes/passes'));
app.use('/api/checks', require('./routes/checks'));
app.use('/api/reports', require('./routes/reports'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Express 5 forwards async errors here
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running on port ' + (process.env.PORT || 5000))))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
