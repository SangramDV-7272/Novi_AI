# Mindful Reflections - AI Journal

A user-authenticated, privacy-first journaling and reflection web application powered by **Gemini 2.5 Flash & 2.5 Pro**, **Firebase Authentication (Google Sign-In)**, **Google Cloud Firestore**, **Firebase Storage**, and **OpenStreetMap with MapLibre GL**.

---

## Architecture & Security Highlights

1. **User Identity & Isolation**:
   - Authentication via Firebase Auth (Google Sign-In).
   - Zero storage of raw credentials or passwords in application code.
   - User data partitioned strictly by authenticated UID (`/users/{userId}/entries/{entryId}`).
2. **Cloud Firestore Security**:
   - Attribute-Based Access Control (ABAC) enforced at the database layer.
   - Cross-user data leakage strictly prevented via owner-bound security rules (`request.auth.uid == userId`).
3. **Multimedia & Storage Security**:
   - User uploads (images, video, PDFs) are partitioned by UID (`users/{userId}/attachments/*`).
   - File deletion removes artifacts from both Firestore and Cloud Storage, preventing orphaned files.
4. **OpenStreetMap & MapLibre GL Mapping**:
   - 100% open-source mapping stack with zero external API key requirements and zero mapping usage charges.
   - Interactive WebGL rendering powered by MapLibre GL JS with layer switcher (Muted Carto Positron, OSM Standard, Voyager).
   - Server-side Nominatim proxying (`/api/maps/geocode`, `/api/maps/places-search`) with compliance User-Agent headers.
5. **Server-Side AI & Model Resilience**:
   - `GEMINI_API_KEY` is retained solely in server-side memory (`server.ts`) and never exposed to the client browser.
   - Voice audio structuring endpoint utilizes Gemini multimodal capabilities with fallback ladder (Gemini 2.5 Flash, 3.7 Flash, 1.5 Flash, 2.5 Pro).

---

## 1. Prerequisites & GCP API Setup

Ensure the Google Cloud CLI (`gcloud`) and Firebase CLI are installed and authenticated. Enable required Cloud services:

```bash
# Set your active GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  storage.googleapis.com
```

---

## 2. Secret Manager Configuration

Securely store your `GEMINI_API_KEY` in Google Cloud Secret Manager and grant the default Cloud Run Compute Service Account accessor permissions:

```bash
# Create and populate Gemini secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Secret Accessor role to the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Firestore & Storage Security Rules

### Firestore Rules
Deploy the following owner-bound security rules to ensure zero cross-user visibility:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document: strictly isolated to the authenticated user
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Subcollections: journal entries, reflections, chats, and attachments
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy via Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Run dev server on port 3000
npm run dev
```

---

## 5. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run, mounting the Gemini secret directly from Secret Manager:

```bash
gcloud run deploy mindful-reflections-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### Mandatory Verification Campaign Label

Apply the required verification label to your Cloud Run service:

```bash
gcloud run services update mindful-reflections-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Functional Verification Walkthrough

To verify and test all interactive features of the application:

### 1. Authentication Flow
- Navigate to the landing page and click **"Continue with Google"**.
- Confirm popup authentication and immediate redirect to your private dashboard.

### 2. Location Tagging with OpenStreetMap & MapLibre GL
- In the New Reflection Editor, find the **"📍 Add Location"** control next to the Mood selector.
- Click it to open the OpenStreetMap Location modal:
  - Select **"Use Current Location"** to verify browser geolocation and reverse-geocoding via OpenStreetMap Nominatim.
  - Or type a location (e.g., *"Central Park, New York"*) in the search field to test place search.
- Once selected, verify the inline OpenStreetMap mini preview and resolved address in the editor.
- Save the reflection and confirm the dashboard card displays an emerald location badge.
- Click the location badge on the card to open the **Interactive MapLibre GL modal**:
  - Test zooming, panning, and rotation controls.
  - Test the **"Re-center"** button.
  - Test the **"Style"** layer switcher (Muted Light, OSM Standard, Voyager).
  - Test the link to view the marker directly on `openstreetmap.org`.

### 3. Multimedia Attachments & Markdown
- In the editor, click **"Attach Media"** to select images (`.png`, `.jpg`), videos (`.mp4`), or documents (`.pdf`).
- Verify upload indicators and preview cards with file sizes and remove (`✕`) buttons.
- Toggle between **"Plain Text"** and **"Markdown"** mode with live split/preview panes.
- Save the reflection and view it in the detail modal:
  - Confirm image thumbnail grid with lightbox zoom.
  - Test embedded video player with playback controls.
  - Verify PDF attachment card with "Open in New Tab" link.
  - Verify Markdown headers, lists, and typography render.
- Test deleting the reflection and confirm attachments are deleted from storage.

### 4. AI Voice Dictation
- In the reflection editor toolbar, click **"Voice Dictation"** (microphone icon).
- Click **"Start Voice Recording"** and grant microphone permissions when prompted.
- Speak freely and observe the animated recording pulse, timer, and live transcript.
- Click **"Done Speaking — Structure Thoughts"**.
- Gemini transcribes and mindfully structures your thoughts, removing filler words into cohesive narrative paragraphs.
- Inspect the editable structured preview. Click **"Insert into Reflection"** to append the text directly into your draft.
