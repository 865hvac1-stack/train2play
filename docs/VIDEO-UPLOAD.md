# Phone video uploads — super simple setup (Cloudinary)

You only need **one** Railway variable.

Cloudinary’s free plan is enough to start. Videos upload from iPhone/Android camera or gallery.

## 1. Create a free Cloudinary account

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up (email is fine)
3. After login, open your **Dashboard**

## 2. Copy your Cloudinary URL

On the dashboard you’ll see something like:

**API Environment variable** / **CLOUDINARY_URL**

It looks like:

```
cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz@your-cloud-name
```

Click **Copy**.

*(If you only see Cloud Name, API Key, and API Secret separately — that’s fine too. Use Step 3B.)*

## 3. Paste into Railway

### Option A — easiest (one variable)

Railway → your Train2Play service → **Variables** → add:

| Name | Value |
| --- | --- |
| `CLOUDINARY_URL` | *(paste the whole cloudinary://… string)* |

Save. Railway redeploys automatically.

### Option B — three separate values

| Name | Value |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | from dashboard |
| `CLOUDINARY_API_KEY` | from dashboard |
| `CLOUDINARY_API_SECRET` | from dashboard |

## 4. Confirm it worked

Open:

[https://train2play-production-efb5.up.railway.app/api/health](https://train2play-production-efb5.up.railway.app/api/health)

You want:

```json
"objectStorage": true
```

Then in the app:

**Videos → Add video → Record / take video** or **Choose from gallery**

## Tips

- Keep clips under **100 MB**
- Use Wi‑Fi for longer videos
- Stay on the screen until upload finishes
- iPhone MOV files work

## Don’t paste secrets in chat

Put `CLOUDINARY_URL` / API secret only in Railway — never send them to Cursor or Slack.

## Advanced (optional)

S3 / Cloudflare R2 still works if you already set those variables. Cloudinary is preferred when both are present.
