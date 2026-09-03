# Mindful Reflections - AI Journal

A user-authenticated, privacy-first journaling and reflection web application powered by **Gemini 3.6 Flash API**, **Firebase Authentication (Google Sign-In)**, and **Google Cloud Firestore**.

---

## Architecture & Security Highlights

1. **User Identity & Isolation**:
   - Authentication via Firebase Auth (Google Sign-In).
   - Zero storage of raw credentials or passwords in application code.
   - User data partitioned strictly by authenticated UID (`/users/{userId}/entries/{entryId}`).
2. **Cloud Firestore Security**:
   - Attribute-Based Access Control (ABAC) enforced at the database layer.
   - Cross-user data leakage strictly prevented via owner-bound security rules (`request.auth.uid == userId`).
3. **Server-Side AI Proxying**:
   - `GEMINI_API_KEY` is retained solely in server-side memory (`server.ts`) and never exposed to the client browser.
   - Multi-turn conversational reflections, automated summarization, and key insight synthesis with resilient model fallback ladders.

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
  identitytoolkit.googleapis.com
```

---

## 2. Secret Manager Configuration

Securely store your `GEMINI_API_KEY` in Google Cloud Secret Manager and grant the default Cloud Run Compute Service Account accessor permissions:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Set the secret value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Secret Accessor role to the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Firestore Security Rules

Deploy the following owner-bound security rules to ensure zero cross-user visibility:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document: strictly isolated to the authenticated user
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Subcollections: journal entries, reflections, and chats
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy via Firebase CLI:

```bash
firebase deploy --only firestore:rules
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

Build and deploy the application container to Google Cloud Run, mounting the `GEMINI_API_KEY` directly from Secret Manager:

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

1. **Authentication Flow**:
   - Navigate to the landing page.
   - Click **"Continue with Google"** to trigger the Firebase Auth popup.
   - Confirm redirection to your private dashboard.
2. **Writing a Reflection**:
   - Click **"Write Reflection"** or **"New Reflection"**.
   - Choose a category (e.g. *Gratitude & Joy*) and a mood (e.g. *Peaceful*).
   - Click **"Inspire Me with Gemini"** to dynamically generate reflection prompts.
   - Enter your personal journal notes and click **"Save Reflection"**.
   - Verify that the entry appears in your chronological history list with confetti.
3. **Multi-Turn Conversational Reflection**:
   - Click **"Reflect with Gemini"** on the entry.
   - Ask follow-up questions (e.g., *"What cognitive blindspots do you notice?"* or *"Help me find what I can control"*).
   - Verify that Gemini responds with structured, compassionate inquiry.
4. **Auto-Synthesis & Takeaways**:
   - Click **"Synthesize"** in the reflection drawer or **"Synthesize Insights"** in the editor.
   - Verify that a concise summary and 2-4 key takeaways are generated and saved to Firestore.
5. **History & Search**:
   - Filter reflections by category pill or search keyword in the history search bar.
   - Click the view details button to inspect the full transcript or export markdown.
