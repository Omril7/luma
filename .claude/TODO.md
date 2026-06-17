# TODO — Tasks for You (Omri) — Luma project

Things Claude can't do on your behalf — external accounts, credentials, secrets.
Check items off as you complete them and I'll update future plans accordingly.

---

## 🔐 Credentials & Environment Setup

### Supabase (database)

- [x] Create a Supabase project at https://supabase.com → New Project (Luma studio organization)
- [x] Go to **Project Settings → Database** and copy:
  - **Connection string (Transaction mode, port 6543)** → `DATABASE_URL` (add `?pgbouncer=true` at the end)
  - **Connection string (Session mode, port 5432)** → `DIRECT_URL`
- [x] Copy `.env.example` → `.env.local` and fill in `DATABASE_URL` and `DIRECT_URL`
- [x] Run `npm run db:migrate` to apply the schema to your Supabase dev project
- [x] Run `npm run db:seed` to seed sample products (after M1.2 seed is implemented)

### Cloudinary (image storage)

- [ ] Create a Cloudinary account at https://cloudinary.com (Luma studio organization)
- [ ] Go to **Dashboard → API Keys** and copy the **API URL** (format: `cloudinary://<api_key>:<api_secret>@<cloud_name>`)
- [ ] Add to `.env.local`: `CLOUDINARY_URL=cloudinary://...` and `STORAGE_DRIVER=cloudinary`

### JWT secret

- [x] Generate a strong random secret: https://generate-secret.vercel.app/32
- [x] Add to `.env.local`: `JWT_SECRET=<your-secret>`
- [ ] Add to `.env.local`: `JWT_SECRET=<eden-secret>` (from https://generate-secret.vercel.app/32)

### Admin user

- [x] Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` (used by the seed script)
- [ ] Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` (change for Eden's data)

---

## 🚀 Deployment (when ready to go live)

### Vercel

- [ ] Import the repo at https://vercel.com/new (Luma studio organization)
- [ ] Set all env vars from `.env.example` in the Vercel dashboard (Production + Preview)
  - `DATABASE_URL` — pooled connection (port 6543, `?pgbouncer=true`)
  - `DIRECT_URL` — direct connection (port 5432, for migrations)
  - `CLOUDINARY_URL`, `STORAGE_DRIVER=cloudinary`
  - `JWT_SECRET`, `JWT_EXPIRES_IN=2h`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER`
- [ ] Add **Build Command** override: `prisma migrate deploy && next build`
- [ ] Deploy — Vercel auto-detects Next.js 15

### Supabase production project

- [ ] Create a separate Supabase project for production (keep dev project for dev)
- [ ] Set production `DATABASE_URL` / `DIRECT_URL` in Vercel dashboard

---

## 📧 Email (when implementing newsletter / order confirmations)

- [ ] Choose an SMTP provider:
  - Resend (recommended, developer-friendly): https://resend.com
  - Sendgrid: https://sendgrid.com
  - Or use Nodemailer with Gmail/other SMTP
- [ ] Add SMTP credentials to `.env.local`:
  ```
  EMAIL_PROVIDER=nodemailer
  EMAIL_SMTP_HOST=smtp.resend.com
  EMAIL_SMTP_PORT=587
  EMAIL_SMTP_USER=resend
  EMAIL_SMTP_PASS=<api-key>
  EMAIL_FROM=hello@yourdomain.com
  ```

---

## 💳 Payments (Phase 2)

- [ ] Choose a payment provider (Israeli processors):
  - **Meshulam** (recommended for Israel): https://meshulam.co.il
  - **Tranzila**: https://www.tranzila.com
  - **PayPlus**: https://payplus.co.il
- [ ] Get API credentials from chosen provider
- [ ] Set `PAYMENT_PROVIDER=meshulam` (or `tranzila` / `payplus`) in `.env.local`

---

## 📦 GitHub Repository

- [x] Create a new GitHub repo named **luma** (github.com/Omril7/luma)
- [x] Add the remote and push:
  ```bash
  git remote add origin https://github.com/Omril7/luma.git
  git push -u origin main
  ```
- [x] Rename the local project folder from `eden-project` to `luma`:
  - Close VS Code / Claude Code first
  - Rename `C:\Users\omril\Projects\eden-project` → `C:\Users\omril\Projects\luma`
  - Reopen in VS Code from the new path
  - Claude Code will create a new memory directory at the new path automatically

---

## 🛠 Local Dev Gotchas

- [ ] **NODE_ENV during build:** If your shell has `NODE_ENV=development` set (common on Windows), `npm run build` will warn and may behave unexpectedly. Always build with `NODE_ENV` unset or explicitly set to `production`:
  ```powershell
  $env:NODE_ENV = "production"; npm run build
  ```
  Or use `Remove-Item Env:NODE_ENV` to unset it.

---

_This file is maintained by Claude. I'll add new tasks here when they come up during development._
