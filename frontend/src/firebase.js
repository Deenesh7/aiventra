// Firebase initialization for AIVENTRA
// Cloud data plane: Auth, Firestore, Analytics
// (Evidence file uploads are handled by Cloudinary — see services/cloudinary.js
//  because Firebase Storage requires the paid Blaze plan.)
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD-vOoyPZaHv5tinyaawGQk-fFhByPewnc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'trace-8e47e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'trace-8e47e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'trace-8e47e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1021202859943',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1021202859943:web:6d722379b254ad1d5b1882',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-BBWKJSZCZJ',
};

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.warn('[firebase] persistence init failed:', e?.code || e),
);

export const db = getFirestore(firebaseApp);

export let analytics = null;
analyticsSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(firebaseApp);
  })
  .catch(() => {});

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
