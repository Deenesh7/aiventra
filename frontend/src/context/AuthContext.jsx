import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setAuthTokenProvider } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Wire the API client so every request can grab a fresh Firebase ID token
  useEffect(() => {
    setAuthTokenProvider(async () => {
      const u = auth.currentUser;
      if (!u) return null;
      try {
        return await u.getIdToken();
      } catch {
        return null;
      }
    });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch (or create) the user profile doc in Firestore
        const profRef = doc(db, 'users', u.uid);
        const snap = await getDoc(profRef);
        if (snap.exists()) {
          setProfile({ id: u.uid, ...snap.data() });
        } else {
          const fresh = {
            email: u.email,
            name: u.displayName || (u.email ? u.email.split('@')[0] : 'Investigator'),
            role: 'investigator',
            department: 'Forensic Investigation',
            created_at: serverTimestamp(),
          };
          await setDoc(profRef, fresh);
          setProfile({ id: u.uid, ...fresh });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try { await updateProfile(res.user, { displayName: name }); } catch (_) {}
    }
    await setDoc(doc(db, 'users', res.user.uid), {
      email,
      name: name || email.split('@')[0],
      role: 'investigator',
      department: 'Forensic Investigation',
      created_at: serverTimestamp(),
    });
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
