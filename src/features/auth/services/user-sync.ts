import { eq } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import { users } from "../../../db/schema.ts";

export interface SyncUserData {
  uid: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  emailVerified?: boolean;
}

export async function getOrCreateUser(data: SyncUserData) {
  try {
    const { uid, email, name, avatar, emailVerified } = data;
    
    // Generate an optional username placeholder from email if not already present
    const usernameSeed = email.split("@")[0] + Math.floor(Math.random() * 1000);

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || null,
        avatar: avatar || null,
        emailVerified: emailVerified || false,
        username: usernameSeed,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          emailVerified: emailVerified || false,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user registration / sync failed:", error);
    throw new Error("Database user registration failed. Please try again later.", {
      cause: error,
    });
  }
}

export async function updateUserProfile(uid: string, fields: Partial<typeof users.$inferInsert>) {
  try {
    const result = await db
      .update(users)
      .set({
        ...fields,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error(`Failed to update profile for user ${uid}:`, error);
    throw error;
  }
}

