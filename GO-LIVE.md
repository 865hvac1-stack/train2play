# Train2Play — Go live checklist

Use this when deploying **train2play.com** for real coaches and test accounts.

## Before you deploy

- [ ] GitHub repo is connected to Railway or Render
- [ ] PostgreSQL database is added to the project
- [ ] Domain **train2play.com** is available in your DNS provider

## Required env vars (set on the app service)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | From Postgres service (Railway: reference `${{Postgres.DATABASE_URL}}`) |
| `AUTH_SECRET` | Run `openssl rand -base64 32` — paste result |
| `AUTH_URL` | `https://train2play.com` (or your Railway URL until DNS is ready) |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `SEED_DEMO` | `false` |

## Recommended before coaches upload video

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Pickup alert + parent invite emails |
| `EMAIL_FROM` | `Train2Play <noreply@train2play.com>` |
| `S3_BUCKET` | Cloudflare R2 bucket name |
| `S3_ENDPOINT` | R2 endpoint URL |
| `S3_PUBLIC_URL` | Public URL for videos (custom domain or R2 dev URL) |
| `AWS_ACCESS_KEY_ID` | R2 access key |
| `AWS_SECRET_ACCESS_KEY` | R2 secret |
| `S3_REGION` | `auto` for R2 |

## Deploy steps (Railway)

1. **New Project** → Deploy from GitHub → select this repo
2. **Add PostgreSQL** to the project
3. On the **web service**, add env vars from the table above
4. Link `DATABASE_URL` to the Postgres plugin variable
5. Deploy — migrations run automatically on start
6. Open `https://YOUR-APP.up.railway.app/api/health` → expect `"status":"ok"`
7. Sign up at `/signup` to create your first test coach account
8. Add custom domain **train2play.com** in Railway → update DNS (CNAME)
9. Change `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://train2play.com` → redeploy

## After go-live smoke test

- [ ] Sign up → onboarding (zip + sport) → dashboard loads
- [ ] Add an athlete
- [ ] Upload a coaching video (requires R2/S3 configured)
- [ ] Settings → pickup alerts saved
- [ ] `/api/health` returns ok with database connected

## Create test accounts

Production does **not** include demo logins. For each tester:

1. Send them to `https://train2play.com/signup`
2. They complete onboarding
3. They build out roster / pickup / video as needed

For a **staging** copy with demo data: set `SEED_DEMO=true`, run `npm run db:seed` once.

## Push updates after launch

Every push to `main` redeploys automatically. Database migrations run on each deploy — no manual steps.

---

Full local dev and stack details are in [README.md](./README.md).
