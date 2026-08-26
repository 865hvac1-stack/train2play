# Train2Play — Go live checklist

Use this when deploying **train2play.com** for real coaches and test accounts.

The app is **code-ready to launch**. Complete the ops steps below, then smoke-test.

## Before you deploy

- [ ] GitHub repo connected to Railway or Render
- [ ] PostgreSQL database added to the project
- [ ] Domain **train2play.com** ready in your DNS provider
- [ ] Mailbox for `support@train2play.com` (or forward to your inbox)

## Required env vars

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | From Postgres (Railway: reference the Postgres variable) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Temporary Railway URL first, then `https://train2play.com` |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `SEED_DEMO` | `false` |

## Strongly recommended before testers

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Welcome email on signup, pickup alerts, parent invites, password reset, athlete invites |
| `EMAIL_FROM` | `Train2Play <noreply@train2play.com>` (verify domain in Resend) |
| `CLOUDINARY_URL` | **Phone video uploads** (easiest — one variable from cloudinary.com) |
| `PLATFORM_ADMIN_EMAIL` | Your login — unlocks the Sport library master catalog |
| `TRAINER_EMAILS` | `chase@train2play.com` (comma-separated) — trainer desk |

Optional (only if not using Cloudinary): `S3_BUCKET`, `S3_ENDPOINT`, `S3_PUBLIC_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_REGION`

Without Cloudinary (or S3/R2), **file uploads are blocked in production** (MP4 URL links still work).  
Phone upload setup: [docs/VIDEO-UPLOAD.md](./docs/VIDEO-UPLOAD.md)  
Without Resend, password reset emails cannot send.

## Deploy (Railway)

1. New Project → Deploy from GitHub → this repo
2. Add PostgreSQL
3. Set env vars above on the web service
4. Deploy — migrations run automatically on start
5. Open `/api/health` → expect `"status":"ok"` and `"checks":{"database":true,...}`
6. Sign up at `/signup` (agree to Terms + Privacy) → complete onboarding
7. Add custom domain `train2play.com` → update DNS CNAME
8. Set `AUTH_URL` + `NEXT_PUBLIC_APP_URL` to `https://train2play.com` → redeploy

## After go-live smoke test

- [ ] Sign up → onboarding (zip + sport) → dashboard
- [ ] Add an athlete
- [ ] Add a video via MP4 URL (or upload if R2 is configured)
- [ ] Settings → pickup alerts save
- [ ] Forgot password sends email (requires Resend)
- [ ] `/privacy` and `/terms` load
- [ ] `/api/health` returns ok

## Create test accounts

Production does **not** seed demo logins. For each tester:

1. Send them to `https://train2play.com/signup`
2. They accept Terms/Privacy, complete onboarding, start using the app

Staging-only demo data: set `SEED_DEMO=true` and run `npm run db:seed` in a one-off shell (seed does not run on deploy).

## Push updates after launch

Every push to `main` redeploys. Migrations run on each deploy automatically.

---

Local setup details: [README.md](./README.md)
