import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Dynamically load firebase-applet-config.json if it exists (on the server-side, Node.js)
let serverFirebaseConfig: { projectId?: string } = {};
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    serverFirebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("[Firebase Admin] Could not dynamically load firebase-applet-config.json:", e);
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || serverFirebaseConfig.projectId;

// Initialize default app
if (!getApps().length && projectId) {
  initializeApp({
    projectId: projectId,
  });
}

export const adminAuth = getAuth();

/**
 * Parses the project ID (aud claim) from a JWT token without verifying the signature
 */
export const getProjectIdFromToken = (token: string): string | null => {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadBuf = Buffer.from(parts[1], "base64");
      const payload = JSON.parse(payloadBuf.toString("utf-8"));
      return payload.aud || null;
    }
  } catch (e) {
    console.error("[Auth Admin] Failed to parse project ID from token:", e);
  }
  return null;
};

/**
 * Gets or initializes a Firebase Admin Auth instance for a specific project ID
 */
export const getAdminAuthForProject = (projectId: string) => {
  const apps = getApps();
  const appName = `app-${projectId}`;
  
  let app: App;
  const existingApp = apps.find((a) => a.name === appName);
  
  if (existingApp) {
    app = existingApp;
  } else {
    app = initializeApp(
      {
        projectId: projectId,
      },
      appName
    );
  }
  
  return getAuth(app);
};

/**
 * Decodes and verifies a Firebase ID token using the appropriate project context
 */
export const verifyFirebaseToken = async (token: string) => {
  const projectId = getProjectIdFromToken(token);
  if (!projectId) {
    throw new Error("Invalid token format: no project ID found");
  }

  // Use the specific project auth instance to verify the token
  const projectAuth = getAdminAuthForProject(projectId);
  return await projectAuth.verifyIdToken(token);
};
