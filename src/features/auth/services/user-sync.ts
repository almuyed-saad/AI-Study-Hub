import { eq, sql } from "drizzle-orm";
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
    
    // Check if user with this email already exists but with a different UID (e.g. Firebase project changed)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      const existingUser = existingUserByEmail[0];
      if (existingUser.uid !== uid) {
        console.log(`[getOrCreateUser] Detecting Firebase project/UID mismatch for email ${email}. Old UID: ${existingUser.uid}, New UID: ${uid}. Performing seamless data migration...`);
        const oldUid = existingUser.uid;

        await db.transaction(async (tx) => {
          const tempEmail = `${email}_old_${Date.now()}`;
          const tempUsername = `${existingUser.username || "user"}_old_${Date.now()}`;
          
          // 1. Rename the old user's email and username to free up the unique constraints
          await tx.execute(sql`UPDATE "users" SET "email" = ${tempEmail}, "username" = ${tempUsername} WHERE "uid" = ${oldUid};`);

          // 2. Insert the new user with the new UID and the correct email, copying all fields from the old user record
          await tx.execute(sql`
            INSERT INTO "users" (
              "uid", "email", "name", "username", "avatar", "email_verified", "onboarding_completed",
              "role", "account_status", "bio", "university", "department", "semester", "timezone",
              "theme", "accent_color", "font_size", "layout_density",
              "notify_study_reminders", "notify_planner_reminders", "notify_assignment_reminders",
              "notify_ai_notifications", "notify_email_notifications", "ai_default_model",
              "ai_response_length", "ai_streaming", "ai_explanation_style", "ai_auto_save_conversations",
              "keyboard_shortcuts_enabled", "auto_save_preferences", "default_landing_page", "language_preference"
            )
            SELECT 
              ${uid}, ${email}, "name", ${existingUser.username || "user"}, "avatar", "email_verified", "onboarding_completed",
              "role", "account_status", "bio", "university", "department", "semester", "timezone",
              "theme", "accent_color", "font_size", "layout_density",
              "notify_study_reminders", "notify_planner_reminders", "notify_assignment_reminders",
              "notify_ai_notifications", "notify_email_notifications", "ai_default_model",
              "ai_response_length", "ai_streaming", "ai_explanation_style", "ai_auto_save_conversations",
              "keyboard_shortcuts_enabled", "auto_save_preferences", "default_landing_page", "language_preference"
            FROM "users"
            WHERE "uid" = ${oldUid};
          `);

          // 3. Update all referencing tables to point to the new UID
          const tables = [
            "subjects",
            "notes",
            "documents",
            "conversations",
            "messages",
            "flashcard_decks",
            "quizzes",
            "quiz_attempts",
            "flashcard_progress",
            "study_tasks",
            "notifications",
            "study_sessions",
            "assignments",
            "goals",
            "exams",
            "reminders",
            "ai_study_plans",
            "ai_recommendations",
            "ai_revision_plans"
          ];

          for (const tbl of tables) {
            await tx.execute(sql`UPDATE ${sql.identifier(tbl)} SET "user_id" = ${uid} WHERE "user_id" = ${oldUid};`);
          }

          // 4. Delete the old user record
          await tx.execute(sql`DELETE FROM "users" WHERE "uid" = ${oldUid};`);
        });

        console.log(`[getOrCreateUser] Migration complete. All academic and study records successfully re-linked to new UID: ${uid}`);
      }
    }

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

