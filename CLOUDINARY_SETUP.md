# Cloudinary Setup for AIVENTRA

Cloudinary handles evidence file uploads (PDFs, scene images, video) because
Firebase Storage requires the paid Blaze plan. Cloudinary's free tier is
generous: **25 GB storage, 25 GB monthly bandwidth, no card required**.

---

## 1. Create an account

1. Open https://cloudinary.com and click **Sign up for free**.
2. Use Google sign-in or email — no card required.
3. After signup, you land on the **Dashboard**.

---

## 2. Note your `cloud_name`

On the Dashboard, look at the top — you'll see something like:

```
Cloud name:  djx9k2tpq    [copy]
```

That string is your `cloud_name`. Copy it.

---

## 3. Create an unsigned upload preset

Unsigned presets let the browser upload directly without an API secret —
exactly what AIVENTRA needs.

1. In the Cloudinary console, open **Settings** (gear icon, top right) → **Upload** tab.
2. Scroll down to **Upload presets** and click **Add upload preset**.
3. Configure:
   - **Preset name**: `aiventra-unsigned` (or any name you like — remember it)
   - **Signing Mode**: `Unsigned`
   - **Folder**: `aiventra` (everything uploaded will be organized under this)
   - **Use filename**: ON (keeps original names visible)
   - **Unique filename**: ON (so duplicates don't overwrite)
   - **Overwrite**: OFF
   - **Resource type**: `Auto` (handles images, PDFs, videos in one preset)
4. (Optional but recommended for safety)
   - **Allowed formats**: `jpg,jpeg,png,webp,gif,pdf,mp4,mov,avi`
   - **Max file size**: `52428800` (50 MB) — adjust for video
5. Click **Save**.

---

## 4. Wire it into AIVENTRA

Open `frontend/.env` (copy from `frontend/.env.example` if it doesn't exist)
and set:

```env
VITE_CLOUDINARY_CLOUD_NAME=djx9k2tpq          # your cloud_name from step 2
VITE_CLOUDINARY_UPLOAD_PRESET=aiventra-unsigned  # preset name from step 3
```

Restart `npm run dev` so Vite picks up the new env vars.

---

## 5. Test

1. Open AIVENTRA → **Autopsy Analyzer**.
2. Drop in any PDF and click **Run AI Analysis**.
3. In a new browser tab, go to your Cloudinary **Media Library** — you should
   see the file under `aiventra/evidence/AIV-2026-0118/`.
4. Open Firestore in the Firebase console — there's a new doc in the
   `evidence` collection with the Cloudinary URL in `file_url`.

If the upload silently fails, open the browser DevTools console — Cloudinary
returns descriptive error messages (most common: preset name typo, or the
preset is still set to "Signed").

---

## 6. Security notes for production

Unsigned uploads are fine for development and small teams, but anyone who
inspects your bundle can find the cloud_name and preset name and upload to
your account. For production:

- **Enable Cloudinary's free-tier rate limiting** in Settings → Security →
  set per-IP upload limits.
- **Restrict allowed formats and max file size** in the preset (step 3) —
  this prevents abuse via giant uploads.
- **Add an allowed referrer list** in Settings → Security → Referrer
  restriction → add your production domain. Uploads from other origins get
  rejected.
- **Move to signed uploads** — have the FastAPI backend mint short-lived
  upload signatures. AIVENTRA's `services/cloudinary.js` is already
  structured to swap in signed uploads with a one-line change.

---

## 7. Optional: delete files when evidence is removed

The free tier supports `DELETE /resources` via API, but it requires the
API secret. If your team needs hard-deletes on evidence purge:

1. Add `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to `backend/.env`.
2. Implement a small FastAPI endpoint `POST /api/evidence/delete-file` that
   calls Cloudinary's destroy API with the `public_id` stored in Firestore.
3. Trigger it from `evidenceService.remove()` in
   `frontend/src/services/firestore.js`.

For most use-cases, leaving uploads in Cloudinary's media library and
only deleting the Firestore record is enough (and cheaper).
