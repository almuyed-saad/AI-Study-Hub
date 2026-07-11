import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

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
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
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
