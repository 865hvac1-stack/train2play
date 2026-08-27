# Phone video uploads

## Recommended production setup: private Cloudflare R2

R2 lets coaches upload 5–10 minute film directly from the browser in 10 MB
chunks. A failed chunk retries four times without restarting the whole video.
The bytes never pass through Railway, and the bucket stays private.

### 1. Create the bucket and credentials

1. Cloudflare Dashboard → **R2 Object Storage** → Create bucket.
2. Name it `train2play-videos`.
3. Leave public access disabled.
4. R2 → **Manage R2 API Tokens** → create an Object Read & Write token scoped
   only to this bucket.

### 2. Add bucket CORS

R2 bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://www.train2play.com",
      "https://train2play.com",
      "https://train2play-production-efb5.up.railway.app"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
    "MaxAgeSeconds": 3600
  }
]
```

`ETag` must be exposed: Train2Play needs it to finish a multipart upload.

### 3. Add Railway variables

```dotenv
S3_BUCKET=train2play-videos
S3_REGION=auto
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
```

Do **not** set `S3_PUBLIC_URL`. Videos are private and Train2Play grants a
short-lived playback URL only after checking the viewer.

After redeploying, `/api/health` should show:

```json
"objectStorage": true,
"directPrivateVideo": true
```

## Cloudinary fallback

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

## How long drills fit

Phone cameras record at roughly 10 Mbps, so a 45-second clip is about 55 MB and
a three-minute drill would be over 200 MB — too big for any plan below
Enterprise.

Train2Play compresses video **on the coach's phone before uploading**: 720p at
about 1.8 Mbps. In practice a 53 MB clip becomes ~4 MB, and a three-minute drill
lands near 16 MB. The form shows progress and the before/after size.

Two things worth knowing:

- Compressing plays the clip through, so it takes about as long as the clip.
  Leave the screen open; the Save button waits until it finishes.
- If a browser cannot compress, the original file is uploaded instead. Nothing
  is ever blocked because compression failed.

To lift the ceiling further, switch storage to S3/Cloudflare R2 (below), which
has no per-file limit like Cloudinary's free plan.

## Tips

- Use Wi‑Fi for longer videos
- Stay on the screen until upload finishes
- iPhone MOV files work
- Recording at 1080p instead of 4K makes everything faster

## Don’t paste secrets in chat

Put `CLOUDINARY_URL` / API secret only in Railway — never send them to Cursor or Slack.

When R2 and Cloudinary are both configured, new browser uploads use private,
direct R2. Cloudinary remains the fallback for older upload paths.
