# Visitor Pass Management System (MERN)

Digitises the visitor register: pre-registration, host approval, QR passes with a PDF badge, QR check-in/out, notifications, and reporting.

## Features

| Requirement | Where |
|---|---|
| JWT auth + role-based access (admin, security, employee, visitor) | `server/src/middleware/auth.js`, `routes/auth.js` |
| Visitor registration with photo | `routes/appointments.js` (multer upload) |
| Pre-registration, invite, approve/decline, notify | `routes/appointments.js`, `utils/notify.js` |
| Pass issuance: QR code + PDF badge | `utils/helpers.js` (`issuePass`), `utils/badge.js` |
| Check-in / check-out by QR scan (camera or typed code) | `routes/checks.js`, `client/src/pages/Scan.jsx` |
| Email (Nodemailer) and SMS (Twilio) | `utils/notify.js` — logs to console if not configured |
| Dashboard, search, filters, CSV export | `routes/reports.js`, `Dashboard.jsx`, `Reports.jsx` |
| Bonus: multi-location, audit log, Docker + Nginx | `Appointment.location`, `AuditLog`, `docker-compose.yml` |

Collections: `users`, `visitors`, `appointments`, `passes`, `checklogs` (plus `auditlogs`).

## Run locally

Requires Node 18+ and MongoDB (local or Atlas).

```bash
# 1. API
cd server
npm install
cp .env.example .env      # set MONGO_URI and JWT_SECRET
npm run seed              # demo data
npm run dev               # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

## Run with Docker

```bash
docker compose up --build
docker compose exec server node src/seed.js
# open http://localhost:8080
```

## Demo accounts (password `password123`)

| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Security / front desk | security@demo.com |
| Employee (host) | priya@demo.com, rahul@demo.com |
| Visitor | visitor@demo.com |

## Try the full flow

1. Sign in as **visitor@demo.com** → *Visits* → pre-register a visit with Priya. 
2. Sign in as **priya@demo.com** → *Visits* → Approve. A pass is issued and the visitor is notified (see the server console unless SMTP/Twilio are set).
3. Back as the visitor → *My passes* → show the QR or download the PDF badge.
4. Sign in as **security@demo.com** → *Scan* → scan the QR (or paste the code; the seed prints one). First scan = check in, second = check out.
5. *Reports* → search, filter by date, export CSV. Admin: *Staff* → manage accounts and view the audit log.

## API summary

```
POST /api/auth/register | /login      GET /api/auth/me
GET  /api/users/hosts                 admin: GET/POST/PATCH /api/users
POST /api/appointments                visitor pre-registers (multipart, photo)
POST /api/appointments/invite         host invites / front desk walk-in
GET  /api/appointments?status=        scoped by role
PATCH /api/appointments/:id/status    host/admin approve or reject
PATCH /api/appointments/:id/cancel    visitor cancels
GET  /api/passes/mine | /:id | /:id/pdf     PATCH /:id/revoke
POST /api/checks/scan                 { code } toggles check-in / check-out
GET  /api/reports/summary | /logs | /export | /audit
```

## Notes and next steps

- A pass is valid for the whole appointment day and rejects revoked or cancelled visits.
- The browser camera needs HTTPS (or `localhost`) for QR scanning.
- Ideas for the remaining bonuses: OTP verification at registration (reuse `notify.js`), and multi-organization support by adding an `org` field to every collection and filtering on it in `auth` middleware.

## Deploying (free tier)

1. **MongoDB Atlas:** create a free cluster, allow `0.0.0.0/0`, copy the connection string.
2. **Backend (Render/Railway):** root `server`, build `npm install`, start `npm start`. Set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` (the exact frontend URL, no trailing slash). Run `npm run seed` once.
3. **Frontend (Vercel):** root `client`, preset Vite. Set `VITE_API_URL=https://<backend-host>/api`. `vercel.json` handles page refreshes.

Note: free hosts use temporary disk, so uploaded visitor photos can disappear on restart. For production, store them in S3 or Cloudinary.
