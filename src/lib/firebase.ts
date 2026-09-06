import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import type {
  JournalEntry,
  MediaAttachment,
  CheckInRecord,
  ReminderSettings,
  TherapistReportData,
  UserAISettings,
} from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use specified databaseId if available
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
// Explicitly declare openid and userinfo scopes so that access token allows fetching profile data
googleProvider.addScope('openid');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Ensure user profile document exists
    if (result.user) {
      try {
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(
            userRef,
            {
              uid: result.user.uid,
              email: result.user.email || null,
              displayName: result.user.displayName || 'Reflective Soul',
              photoURL: result.user.photoURL || null,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } else {
          await setDoc(
            userRef,
            {
              lastLoginAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn('Non-blocking: could not update user record in Firestore:', dbErr);
      }
    }
    return result.user;
  } catch (error: any) {
    const isUserCancellation =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.code === 'auth/cancelled-popup-request';

    if (isUserCancellation) {
      // User closed the authentication window without signing in; benign cancellation
      return null;
    }

    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper to read file as base64 data URL
export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Upload media attachment to Firebase Storage with automatic data-URL fallback
export const uploadAttachmentFile = async (
  userId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<MediaAttachment> => {
  const attachmentId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/attachments/${attachmentId}_${safeName}`;

  let type: 'image' | 'video' | 'pdf' = 'image';
  if (file.type.startsWith('video/')) {
    type = 'video';
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    type = 'pdf';
  }

  try {
    const sRef = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(sRef, file, {
      contentType: file.type || undefined,
    });

    return await new Promise<MediaAttachment>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        async (error) => {
          console.warn('Firebase Storage upload failed, falling back to data URL:', error);
          try {
            const dataUrl = await readFileAsDataUrl(file);
            if (onProgress) onProgress(100);
            resolve({
              id: attachmentId,
              name: file.name,
              type,
              mimeType: file.type || 'application/octet-stream',
              url: dataUrl,
              size: file.size,
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            reject(err);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              id: attachmentId,
              name: file.name,
              type,
              mimeType: file.type || 'application/octet-stream',
              url: downloadUrl,
              storagePath,
              size: file.size,
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            const dataUrl = await readFileAsDataUrl(file);
            if (onProgress) onProgress(100);
            resolve({
              id: attachmentId,
              name: file.name,
              type,
              mimeType: file.type || 'application/octet-stream',
              url: dataUrl,
              size: file.size,
              createdAt: new Date().toISOString(),
            });
          }
        }
      );
    });
  } catch (err) {
    console.warn('Direct storage ref creation failed, using data URL fallback:', err);
    const dataUrl = await readFileAsDataUrl(file);
    if (onProgress) onProgress(100);
    return {
      id: attachmentId,
      name: file.name,
      type,
      mimeType: file.type || 'application/octet-stream',
      url: dataUrl,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
  }
};

// Delete attachment from Firebase Storage (no orphaned files)
export const deleteAttachmentFile = async (attachment: MediaAttachment): Promise<void> => {
  if (attachment.storagePath) {
    try {
      const sRef = storageRef(storage, attachment.storagePath);
      await deleteObject(sRef);
    } catch (error) {
      console.warn('Attachment file already removed or inaccessible from storage:', error);
    }
  }
};

// Clean helper to strip undefined values before Firestore writes
function sanitizePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        clean[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? sanitizePayload(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = sanitizePayload(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as Partial<T>;
}

// Save or create a journal entry under /users/{userId}/entries/{entryId}
export const saveJournalEntry = async (
  userId: string,
  entry: JournalEntry
): Promise<void> => {
  if (!userId) throw new Error('User ID is required to save an entry.');
  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  const cleanData = sanitizePayload(entry);
  await setDoc(entryRef, cleanData, { merge: true });
};

const mapDocToEntry = (docSnap: any, defaultUserId: string): JournalEntry => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId || defaultUserId,
    title: data.title || 'Untitled Reflection',
    category: data.category || 'Daily Reflection',
    mood: data.mood || 'thoughtful',
    initialText: data.initialText || '',
    bodyFormat: data.bodyFormat === 'markdown' ? 'markdown' : 'plain',
    location: data.location || null,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    summary: data.summary || '',
    keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
};

// Fetch user journal entries sorted by creation date descending
export const fetchUserEntries = async (userId: string): Promise<JournalEntry[]> => {
  if (!userId) return [];
  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(mapDocToEntry(docSnap, userId));
    });
    return entries;
  } catch (error) {
    console.error('Error fetching user entries:', error);
    // If index fails or first load, fallback to plain collection query
    try {
      const entriesRef = collection(db, 'users', userId, 'entries');
      const snapshot = await getDocs(entriesRef);
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(mapDocToEntry(docSnap, userId));
      });
      return entries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (innerErr) {
      console.error('Fallback query error:', innerErr);
      throw innerErr;
    }
  }
};

// Delete a journal entry and its storage attachments
export const deleteEntryFromFirestore = async (
  userId: string,
  entryId: string,
  attachments?: MediaAttachment[]
): Promise<void> => {
  if (!userId || !entryId) return;
  // Remove associated attachments from storage so no orphaned files exist
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      await deleteAttachmentFile(att).catch(() => {});
    }
  }
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
};

// ==========================================
// FEATURE 5: Mood Check-Ins Persistence
// ==========================================

export const saveCheckInRecord = async (
  userId: string,
  checkIn: CheckInRecord
): Promise<void> => {
  if (!userId || !checkIn.id) throw new Error('User ID and CheckIn ID are required.');
  const checkInRef = doc(db, 'users', userId, 'checkins', checkIn.id);
  const cleanData = sanitizePayload(checkIn);
  await setDoc(checkInRef, cleanData, { merge: true });
};

export const fetchUserCheckIns = async (userId: string): Promise<CheckInRecord[]> => {
  if (!userId) return [];
  try {
    const colRef = collection(db, 'users', userId, 'checkins');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const records: CheckInRecord[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      records.push({
        id: docSnap.id,
        userId: d.userId || userId,
        mood: d.mood || 'Neutral',
        intensity: d.intensity || 3,
        notes: d.notes || '',
        activities: Array.isArray(d.activities) ? d.activities : [],
        location: d.location || null,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      });
    });
    return records;
  } catch (error) {
    console.warn('CheckIns query error, attempting unsorted fallback:', error);
    try {
      const colRef = collection(db, 'users', userId, 'checkins');
      const snapshot = await getDocs(colRef);
      const records: CheckInRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        records.push({
          id: docSnap.id,
          userId: d.userId || userId,
          mood: d.mood || 'Neutral',
          intensity: d.intensity || 3,
          notes: d.notes || '',
          activities: Array.isArray(d.activities) ? d.activities : [],
          location: d.location || null,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });
      return records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (inner) {
      console.error('Failed to fetch check-ins:', inner);
      return [];
    }
  }
};

export const deleteCheckInRecord = async (
  userId: string,
  checkInId: string
): Promise<void> => {
  if (!userId || !checkInId) return;
  const checkInRef = doc(db, 'users', userId, 'checkins', checkInId);
  await deleteDoc(checkInRef);
};

export const saveUserCheckIn = saveCheckInRecord;
export const deleteUserCheckIn = deleteCheckInRecord;

// ==========================================
// FEATURE 5: Reminder Settings Persistence
// ==========================================

export const saveUserReminderSettings = async (
  userId: string,
  settings: ReminderSettings
): Promise<void> => {
  if (!userId) return;
  const settingsRef = doc(db, 'users', userId, 'settings', 'reminders');
  const cleanData = sanitizePayload(settings);
  await setDoc(settingsRef, cleanData, { merge: true });
};

export const fetchUserReminderSettings = async (
  userId: string
): Promise<ReminderSettings | null> => {
  if (!userId) return null;
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'reminders');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        enabled: Boolean(data.enabled),
        timeOfDay: data.timeOfDay || '20:00',
        lastDismissedDate: data.lastDismissedDate,
      };
    }
    return {
      enabled: false,
      timeOfDay: '20:00',
    };
  } catch (err) {
    console.warn('Could not load reminder settings:', err);
    return null;
  }
};

// ==========================================
// FEATURE 6: Therapist Reports Persistence
// ==========================================

export const saveTherapistReport = async (
  userId: string,
  report: TherapistReportData
): Promise<void> => {
  if (!userId || !report.id) throw new Error('User ID and Report ID are required.');
  const reportRef = doc(db, 'users', userId, 'shared_reports', report.id);
  const cleanData = sanitizePayload(report);
  await setDoc(reportRef, cleanData, { merge: true });
};

export const fetchUserTherapistReports = async (
  userId: string
): Promise<TherapistReportData[]> => {
  if (!userId) return [];
  try {
    const colRef = collection(db, 'users', userId, 'shared_reports');
    const snapshot = await getDocs(colRef);
    const reports: TherapistReportData[] = [];
    snapshot.forEach((docSnap) => {
      reports.push({
        id: docSnap.id,
        ...(docSnap.data() as any),
      });
    });
    return reports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching therapist reports:', error);
    return [];
  }
};

export const deleteTherapistReport = async (
  userId: string,
  reportId: string
): Promise<void> => {
  if (!userId || !reportId) return;
  const reportRef = doc(db, 'users', userId, 'shared_reports', reportId);
  await deleteDoc(reportRef);
};

export const revokeTherapistReport = async (
  userId: string,
  reportId: string
): Promise<void> => {
  if (!userId || !reportId) return;
  const reportRef = doc(db, 'users', userId, 'shared_reports', reportId);
  await setDoc(reportRef, { isRevoked: true }, { merge: true });
};

// ==========================================
// FEATURE: BYOK AI Settings Persistence
// ==========================================

export const fetchUserAISettings = async (
  userId: string
): Promise<UserAISettings | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'ai');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        usePersonalKey: Boolean(data.usePersonalKey),
        hasKeyConfigured: Boolean(data.hasKeyConfigured),
        maskedKey: data.maskedKey || null,
        encryptedKey: data.encryptedKey || null,
        updatedAt: data.updatedAt,
        lastTestedAt: data.lastTestedAt,
      };
    }
    return {
      usePersonalKey: false,
      hasKeyConfigured: false,
      maskedKey: null,
      encryptedKey: null,
    };
  } catch (error) {
    console.warn('Could not load AI settings:', error);
    return null;
  }
};

export const saveUserAISettings = async (
  userId: string,
  settings: Partial<UserAISettings>
): Promise<void> => {
  if (!userId) return;
  const docRef = doc(db, 'users', userId, 'settings', 'ai');
  const cleanData = sanitizePayload({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, cleanData, { merge: true });
};

export const deleteUserAISettings = async (
  userId: string
): Promise<void> => {
  if (!userId) return;
  const docRef = doc(db, 'users', userId, 'settings', 'ai');
  await setDoc(
    docRef,
    {
      usePersonalKey: false,
      hasKeyConfigured: false,
      maskedKey: null,
      encryptedKey: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: false }
  );
};

