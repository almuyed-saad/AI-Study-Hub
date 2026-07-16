export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  recaptchaSiteKey?: string;
}

export const firebaseConfig: FirebaseConfig = {
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || "",
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || "",
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || "",
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || "",
  firestoreDatabaseId: ((import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || "",
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || "",
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "",
};
