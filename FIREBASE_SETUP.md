# Firebase Setup for AIVENTRA

This guide takes you from a fresh Firebase project to a fully functional
AIVENTRA deployment. The project ID `trace-8e47e` is already wired into the
frontend config.

> **Note**: AIVENTRA stays entirely on the **free Spark plan**. Evidence
> file uploads use Cloudinary instead of Firebase Storage (which requires
> the paid Blaze plan). See `CLOUDINARY_SETUP.md` for that.

---

## 1. Enable Authentication

1. Open the [Firebase Console](https://console.firebase.google.com/project/trace-8e47e/authentication).
2. Click **Get started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. (Optional) Add additional providers like Google or Microsoft for SSO.

Investigators can now register from the AIVENTRA login screen.

---

## 2. Create Cloud Firestore

1. Open [Firestore](https://console.firebase.google.com/project/trace-8e47e/firestore).
2. Click **Create database**.
3. Choose **Production mode** (we'll deploy explicit rules in the next step).
4. Pick a region close to your users — `asia-south1 (Mumbai)` for India,
   `nam5` for US, `eur3` for EU.
5. Click **Enable**.

### 3. Deploy Firestore security rules

Copy `firestore.rules` from the project root, paste it into the **Rules** tab
in the Firestore console, and click **Publish**. The rules grant
authenticated investigators full access to cases, evidence, geo markers,
timeline events, analyses, and their own user profile.

**Composite indexes**: AIVENTRA queries the `analyses`, `evidence`, and
`timeline_events` collections by `case_id` combined with sort fields. If you
see a Firestore error in your browser console saying *"The query requires
an index"*, **click the link in that error message** and Firebase will
create the right composite index for you (takes ~30s). All five indexes
needed are pre-declared in `firestore.indexes.json` if you prefer to deploy
them via the Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

For production with role separation (admin/investigator/viewer), extend the
rules using Firebase custom claims — set them server-side via the Admin SDK.

---

## 4. (Skipped) Cloud Storage

We deliberately **don't enable Firebase Storage** — it requires the paid
Blaze plan. Evidence uploads go to Cloudinary instead. Follow
`CLOUDINARY_SETUP.md` (5-minute setup, no card needed).

---

## 5. Backend Firebase credentials (optional)

The FastAPI backend verifies Firebase ID tokens **without any credentials
file** by default — it uses Google's published public keys directly. This
is fine for development and small deployments.

For production (custom claims, user revocation, server-side writes), generate
a service account:

1. Open [Service Accounts](https://console.firebase.google.com/project/trace-8e47e/settings/serviceaccounts/adminsdk).
2. Click **Generate new private key** → confirm.
3. Save the JSON file somewhere safe outside the repo.
4. In `backend/.env`, set:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=/absolute/path/to/firebase-sa.json
   ```

Restart the backend — you'll see `[firebase] admin SDK initialized`.

---

## 6. Authorized domains

Add your production domain (e.g. `aiventra.app`) to **Authentication → Settings → Authorized domains**.
`localhost` is pre-authorized for development.

---

## 7. Optional hardening

- **App Check**: Enable reCAPTCHA v3 to prevent abuse of your API key.
- **API key restrictions**: In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=trace-8e47e), restrict the browser API key to your domains and to Identity Toolkit + Firestore.
- **Budgets**: Set billing alerts (Firebase has free-tier overage protection by default on Spark plan, but worth confirming).
- **Analytics**: Audience and event data flow automatically — view in the Analytics tab.

---

## 8. First run

```bash
cd frontend && npm install && npm run dev
# in another terminal
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
```

1. Open http://localhost:5173
2. Register any email + 6+ character password — your user is provisioned in `users/{uid}` in Firestore.
3. The first time you open the Dashboard or Cases page, AIVENTRA auto-seeds six demo investigations into Firestore.
4. Upload an autopsy PDF in the Autopsy Analyzer — the file lands in your Cloudinary `aiventra/evidence/...` folder, an evidence record appears in Firestore with the Cloudinary URL, and the NLP pipeline runs on the FastAPI backend.

---

## Data model reference

| Collection | Document fields |
|---|---|
| `users/{uid}` | `email`, `name`, `role`, `department`, `created_at` |
| `cases/{caseId}` | `case_number`, `title`, `location`, `status`, `priority`, `case_type`, `risk_score`, `risk_level`, `description`, `victim`, `investigator`, `evidence_count`, `incident_date`, `created_at`, `updated_at` |
| `evidence/{evId}` | `case_id`, `type`, `name`, `description`, `collected_by`, `collected_at`, `chain_of_custody[]`, `file_url` (Cloudinary URL), `storage_path` (Cloudinary public_id), `metadata` |
| `geo_markers/{id}` | `case_id`, `type`, `lat`, `lng`, `label`, `note`, `timestamp` |
| `timeline_events/{id}` | `case_id`, `time`, `title`, `source`, `severity`, `location`, `description`, `evidence_ids[]` |

Evidence files live in Cloudinary under `aiventra/evidence/{caseId}/...`.
The Firestore `evidence` document stores the Cloudinary `secure_url` and
`public_id` for retrieval and (optional) deletion.
