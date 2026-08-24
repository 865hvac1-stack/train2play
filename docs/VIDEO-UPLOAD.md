# Enable phone video uploads (Cloudflare R2)

Train2Play can accept videos from iPhone/Android cameras and galleries.
In production (Railway), files must go to **cloud object storage** — the server disk is wiped on every deploy.

**Cloudflare R2** has a generous free tier and works with the app today.

## 1. Create an R2 bucket

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **R2 Object Storage** → **Create bucket**
3. Name it something like `train2play-videos`
4. Create the bucket

## 2. Allow public reads (so coaches can play clips)

Option A — **R2 custom domain** (recommended):

1. Bucket → **Settings** → **Custom Domains**
2. Connect a subdomain like `videos.train2play.com`
3. Use that URL as `S3_PUBLIC_URL`

Option B — **Public bucket / r2.dev URL** (quick testing):

1. Bucket → **Settings** → **Public access** / R2.dev subdomain
2. Copy the public base URL

## 3. Create an API token

1. R2 → **Manage R2 API Tokens** → **Create API token**
2. Permissions: **Object Read & Write** on your bucket
3. Copy:
   - Access Key ID
   - Secret Access Key
   - Endpoint (looks like `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)

## 4. Add variables in Railway

On your Train2Play web service → **Variables**:

| Variable | Example |
| --- | --- |
| `S3_BUCKET` | `train2play-videos` |
| `S3_ENDPOINT` | `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com` |
| `S3_PUBLIC_URL` | `https://videos.train2play.com` (no trailing slash) |
| `S3_REGION` | `auto` |
| `AWS_ACCESS_KEY_ID` | (R2 access key id) |
| `AWS_SECRET_ACCESS_KEY` | (R2 secret) |

Redeploy (or wait for auto-redeploy).

## 5. Confirm it worked

Open: `https://YOUR-APP.up.railway.app/api/health`

You want:

```json
"objectStorage": true
```

Then in the app: **Videos → Add video → Record / take video** or **Choose from gallery**.

## Tips for mobile

- Keep clips under **100 MB** (about 1–3 minutes of phone video is usually fine)
- Prefer Wi‑Fi for longer clips
- iPhone Camera Roll videos (MOV) are supported
- Stay on the upload screen until it finishes

## Without R2

You can still paste a **direct MP4 URL** (not a YouTube page link) on the Add video screen.
