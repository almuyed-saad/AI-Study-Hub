import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, googleAuthProvider } from "../../../lib/firebase.ts";
import { firebaseConfig } from "../../../lib/firebase-config.ts";
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
  syncProfile: (idToken: string, force?: boolean) => Promise<User>;
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

  // Keep track of active/in-flight sync requests by user ID (or token payload) to prevent concurrent duplicates
  const activeSyncs = useRef<Map<string, Promise<User>>>(new Map());

  // Keep track of successful syncs to prevent repetitive network calls
  const successfulSyncs = useRef<Map<string, { user: User; timestamp: number }>>(new Map());

  const getUidFromToken = (tok: string): string | null => {
    try {
      const parts = tok.split(".");
      if (parts.length === 3) {
        const base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        const payload = JSON.parse(atob(base64));
        return payload.sub || null;
      }
    } catch (e) {
      console.warn("[Auth] Failed to parse UID from JWT token payload:", e);
    }
    return null;
  };

  // Synchronize Firebase Auth profile with PostgreSQL database via backend API
  const syncProfile = async (idToken: string, force = false): Promise<User> => {
    // Generate a deduplication key using user's UID (or the token string itself if parsing fails)
    const syncKey = getUidFromToken(idToken) || idToken;

    // Check if we have a recent successful sync within the last 60 seconds, and bypass if not forced
    const now = Date.now();
    const recentSync = successfulSyncs.current.get(syncKey);
    if (!force && recentSync && now - recentSync.timestamp < 60000) {
      console.log(`[useAuth] Returning cached profile sync for key: ${syncKey}`);
      return recentSync.user;
    }

    if (activeSyncs.current.has(syncKey)) {
      console.log(`[useAuth] Reusing active in-flight profile sync promise for key: ${syncKey}`);
      return activeSyncs.current.get(syncKey)!;
    }

    const syncPromise = (async () => {
      let response: Response | null = null;
      let attempt = 0;
      const maxAttempts = 3;
      let delay = 500;

      while (attempt < maxAttempts) {
        try {
          response = await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
          });

          // Handle rate-limiting (429) or other transient error with retry
          if (response.status === 429 || response.status === 503) {
            attempt++;
            if (attempt < maxAttempts) {
              console.warn(`[useAuth] Transient auth sync error (${response.status}). Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2;
              continue;
            }
          }

          break; // break loop if successful or not a retryable error
        } catch (fetchErr) {
          attempt++;
          if (attempt < maxAttempts) {
            console.warn(`[useAuth] Network failed to sync. Retrying in ${delay}ms...`, fetchErr);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          throw fetchErr;
        }
      }

      try {
        if (!response || !response.ok) {
          const status = response ? response.status : 0;
          const errorMsg = `Sync profile failed with status: ${status}`;
          const err = new Error(errorMsg);
          (err as any).status = status;
          throw err;
        }

        const data = await response.json();
        const syncedUser = data.user as User;
        
        // Cache the successful sync
        successfulSyncs.current.set(syncKey, { user: syncedUser, timestamp: Date.now() });
        return syncedUser;
      } catch (error: any) {
        console.error("Failed to sync profile with Cloud SQL backend:", error);

        // Fallback user object using token payload if backend sync is rate-limited or offline
        const uid = getUidFromToken(idToken) || "fallback-uid";
        let email = "user@example.com";
        let name = "Academic Pioneer";
        let avatar = "";
        try {
          const parts = idToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            email = payload.email || email;
            name = payload.name || name;
            avatar = payload.picture || avatar;
          }
        } catch (e) {}

        const fallbackUser: User = {
          id: 0,
          uid,
          email,
          name,
          username: email.split("@")[0],
          avatar,
          emailVerified: true,
          onboardingCompleted: true,
          role: "user",
          accountStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          bio: "",
          university: "",
          department: "",
          semester: "Semester 1",
          timezone: "UTC",
          theme: "light",
          accentColor: "violet",
          fontSize: "medium",
          layoutDensity: "cozy",
          notifyStudyReminders: true,
          notifyPlannerReminders: true,
        } as any;

        // If we have a previously cached user (from successfulSyncs), return it. Otherwise, return fallback user.
        if (recentSync) {
          console.log("[useAuth] Returning previous successful sync user as emergency backup on failure.");
          return recentSync.user;
        }

        console.log("[useAuth] Returning client-side generated fallback user as emergency backup on failure.");
        return fallbackUser;
      } finally {
        // Clean up when the request completes (whether successfully or with error)
        activeSyncs.current.delete(syncKey);
      }
    })();

    activeSyncs.current.set(syncKey, syncPromise);
    return syncPromise;
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

  const isTokenProjectValid = (token: string, expectedProjectId: string): boolean => {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        const payload = JSON.parse(atob(base64));
        return payload.aud === expectedProjectId;
      }
    } catch (e) {
      console.warn("[Auth] Failed to decode JWT token:", e);
    }
    return true;
  };

  useEffect(() => {
    let lastUid: string | null = null;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          if (!isTokenProjectValid(idToken, firebaseConfig.projectId)) {
            console.warn(`[Auth] Audience mismatch detected: expected ${firebaseConfig.projectId}. Clearing stale session.`);
            try {
              await signOut(auth);
            } catch (err) {
              console.error("[Auth] Failed to sign out:", err);
            }
            lastUid = null;
            setDbUser(null);
            setToken(null);
            setFirebaseUser(null);
            localStorage.removeItem("firebase-token");
            setLoading(false);
            return;
          }

          setToken(idToken);
          // Only sync database profile if the user actually changed/just logged in
          if (user.uid !== lastUid) {
            lastUid = user.uid;
            const syncedUser = await syncProfile(idToken);
            setDbUser(syncedUser);
          }
        } catch (error: any) {
          console.error("Background auto-sync failed:", error);
          // Force sign out if the token is stale or unauthorized (such as audience mismatch)
          if (error?.status === 401 || error?.message?.includes("401")) {
            console.warn("[Auth] Stale or invalid credentials detected. Forcing Firebase logout.");
            try {
              await signOut(auth);
            } catch (err) {
              console.error("[Auth] Failed to sign out:", err);
            }
            lastUid = null;
            setDbUser(null);
            setToken(null);
            setFirebaseUser(null);
            localStorage.removeItem("firebase-token");
          }
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
