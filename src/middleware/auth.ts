import { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../lib/firebase-admin.ts";
import { DecodedIdToken } from "firebase-admin/auth";
import { getOrCreateUser } from "../features/auth/services/user-sync.ts";

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

// In-memory cache to skip database query overhead for already verified/synced users in the current session
const syncedUids = new Set<string>();

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await verifyFirebaseToken(token);
    req.user = decodedToken;

    // Self-healing: Ensure user profile is registered and synchronized in PostgreSQL db
    const { uid, email, name, picture, email_verified } = decodedToken;
    if (uid && email && !syncedUids.has(uid)) {
      try {
        await getOrCreateUser({
          uid,
          email,
          name: name || null,
          avatar: picture || null,
          emailVerified: email_verified || false,
        });
        syncedUids.add(uid);
        console.log(`[Auth Middleware] Automatically synchronized and registered user in PostgreSQL: ${email} (${uid})`);
      } catch (syncError) {
        console.error(`[Auth Middleware] Background auto-sync failed for user ${uid}:`, syncError);
      }
    }

    next();
  } catch (error: any) {
    if (error?.code === "auth/id-token-expired" || (error?.message && error.message.includes("expired"))) {
      console.warn("[Auth] Firebase ID token has expired:", error.message || error);
      return res.status(401).json({ error: "Unauthorized: Token expired", code: "auth/id-token-expired" });
    }
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
