// src/lib/userProfile.ts
//
// Creates the users/{uid} document on first sign-in and refreshes a
// last-seen stamp on every later one.
//
// This is deliberately fire-and-forget: a profile write failing must not
// block sign-in. AuthGate calls it without awaiting.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { getFirebaseDb } from './firebase';
import { AuthUser } from '../store/authState';

export async function ensureUserProfile(user: AuthUser): Promise<void> {
  if (!user || !user.uid) {
    return;
  }

  try {
    const ref = doc(getFirebaseDb(), 'users', user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await setDoc(ref, { lastSeenAt: serverTimestamp() }, { merge: true });
      return;
    }

    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    });
  } catch (error) {
    // Swallowed on purpose. The user is signed in and the app works
    // without a profile document; logging is enough.
    // eslint-disable-next-line no-console
    console.warn('[ManagerTalk] Could not write user profile:', error);
  }
}
