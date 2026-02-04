"use server";

import { z } from "zod";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmail, generateWaitlistWelcomeEmail, addContactToList } from "@/lib/brevo";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  referredBy: z.string().optional(),
});

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SL-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function joinWaitlist(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    referredBy: (formData.get("ref") as string) || undefined,
  };

  const parsed = waitlistSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, referredBy } = parsed.data;

  try {
    // Check if already on waitlist
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existing.length > 0) {
      return {
        error: "This email is already on the waitlist",
        referralCode: existing[0].referralCode,
      };
    }

    // Get next position
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(waitlist);
    const position = count + 1;

    // Generate unique referral code
    const referralCode = generateReferralCode();

    // Insert into waitlist
    const [entry] = await db
      .insert(waitlist)
      .values({
        email,
        referralCode,
        referredBy: referredBy || null,
        position,
      })
      .returning();

    // Send welcome email (non-blocking)
    sendEmail({
      to: [{ email }],
      subject: `You're #${position} on the SignalLeague Waitlist`,
      htmlContent: generateWaitlistWelcomeEmail(referralCode, position),
    }).catch((err) => console.error("[Waitlist] Email send failed:", err));

    // Add to Brevo contact list (non-blocking)
    const brevoListId = parseInt(process.env.BREVO_WAITLIST_LIST_ID || "0");
    if (brevoListId) {
      addContactToList(email, brevoListId).catch((err) =>
        console.error("[Waitlist] Brevo contact add failed:", err)
      );
    }

    return {
      success: true,
      position: entry.position,
      referralCode: entry.referralCode,
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("unique constraint")
    ) {
      return { error: "This email is already on the waitlist" };
    }
    console.error("[Waitlist] Error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
