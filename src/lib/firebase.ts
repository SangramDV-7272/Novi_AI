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
import type { JournalEntry } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use specified databaseId if available
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Ensure user profile document exists
    if (result.user) {
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
    }
    return result.user;
  } catch (error: any) {
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

// Fetch user journal entries sorted by creation date descending
export const fetchUserEntries = async (userId: string): Promise<JournalEntry[]> => {
  if (!userId) return [];
  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        userId: data.userId || userId,
        title: data.title || 'Untitled Reflection',
        category: data.category || 'Daily Reflection',
        mood: data.mood || 'thoughtful',
        initialText: data.initialText || '',
        summary: data.summary || '',
        keyInsights: data.keyInsights || [],
        messages: data.messages || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
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
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          category: data.category || 'Daily Reflection',
          mood: data.mood || 'thoughtful',
          initialText: data.initialText || '',
          summary: data.summary || '',
          keyInsights: data.keyInsights || [],
          messages: data.messages || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
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

// Delete a journal entry
export const deleteEntryFromFirestore = async (
  userId: string,
  entryId: string
): Promise<void> => {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
};
