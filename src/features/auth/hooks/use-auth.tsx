import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleAuthProvider } from "../../../lib/firebase.ts";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { User } from "../../../types/index.ts";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  token: string | null;
  loginWithGoogle: () => Promise<void>;
  registerWithEmailPassword: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerificationLink: () => Promise<void>;
  syncProfile: (idToken: string) => Promise<User>;
  updateProfile: (fields: Partial<User>) => Promise<User>;
  deleteAccount: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize Firebase Auth profile with PostgreSQL database via backend API
  const syncProfile = async (idToken: string): Promise<User> => {
    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sync profile failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.user as User;
    } catch (error) {
      console.error("Failed to sync profile with Cloud SQL backend:", error);
      throw error;
    }
  };

  const updateProfile = async (fields: Partial<User>): Promise<User> => {
    try {
      if (!token) throw new Error("No active auth token found");
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        throw new Error(`Update profile failed with status: ${response.status}`);
      }

      const data = await response.json();
      setDbUser(data.user);
      return data.user as User;
    } catch (error) {
      console.error("Failed to update user profile in PostgreSQL database:", error);
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    try {
      if (!token) throw new Error("No active auth token found");
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Account deletion failed with status: ${response.status}`);
      }

      await logout();
    } catch (error) {
      console.error("Failed to delete account:", error);
      throw error;
    }
  };

  const signOutAllDevices = async (): Promise<void> => {
    try {
      if (!token) throw new Error("No active auth token found");
      const response = await fetch("/api/auth/signout-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sign out all devices failed with status: ${response.status}`);
      }

      await logout();
    } catch (error) {
      console.error("Failed to sign out of all devices:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken(true);
      setToken(idToken);
      
      // Perform immediate background profile synchronization
      const syncedUser = await syncProfile(idToken);
      setDbUser(syncedUser);
    } catch (error: any) {
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        console.warn("Google Sign-In popup closed or cancelled by user.");
      } else {
        console.error("Google Sign-In or profile sync failed:", error);
      }
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmailPassword = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately set the display name on the Firebase user profile
      await updateFirebaseProfile(result.user, { displayName });
      
      const idToken = await result.user.getIdToken(true);
      setToken(idToken);

      // Perform profile sync to create PostgreSQL account
      const syncedUser = await syncProfile(idToken);
      setDbUser(syncedUser);
    } catch (error) {
      console.error("Email/Password registration failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken(true);
      setToken(idToken);

      // Perform profile sync
      const syncedUser = await syncProfile(idToken);
      setDbUser(syncedUser);
    } catch (error) {
      console.error("Email/Password sign-in failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset dispatch failed:", error);
      throw error;
    }
  };

  const sendEmailVerificationLink = async () => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user session found to verify email");
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error) {
      console.error("Email verification dispatch failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setDbUser(null);
      setFirebaseUser(null);
      setToken(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let lastUid: string | null = null;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          // Only sync database profile if the user actually changed/just logged in
          if (user.uid !== lastUid) {
            lastUid = user.uid;
            const syncedUser = await syncProfile(idToken);
            setDbUser(syncedUser);
          }
        } catch (error) {
          console.error("Background auto-sync failed:", error);
        }
      } else {
        lastUid = null;
        setDbUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Proactive token refresh interval to prevent token expiration during active single-page sessions
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          // Force refresh the token to obtain a fresh one
          const freshToken = await auth.currentUser.getIdToken(true);
          setToken(freshToken);
          console.log("[Auth] Proactively refreshed Firebase ID Token.");
        } catch (error) {
          console.error("[Auth] Proactive token refresh failed:", error);
        }
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("firebase-token", token);
    } else {
      localStorage.removeItem("firebase-token");
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user: dbUser,
        firebaseUser,
        loading,
        token,
        loginWithGoogle,
        registerWithEmailPassword,
        loginWithEmailPassword,
        logout,
        sendPasswordReset,
        sendEmailVerificationLink,
        syncProfile,
        updateProfile,
        deleteAccount,
        signOutAllDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
