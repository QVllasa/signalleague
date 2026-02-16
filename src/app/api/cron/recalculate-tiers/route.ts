import { NextResponse } from "next/server";
import { recalculateAllTiers } from "@/lib/ranking";
import { recalculateAllTransparencyScores } from "@/lib/transparency";
import { detectScamFlags } from "@/lib/scam-detection";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { signalGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { success } = await rateLimit("cron:recalculate", 10, 60);
  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Recalculate tiers
    const tierResults = await recalculateAllTiers();

    // 2. Recalculate transparency scores
    const transparencyResults = await recalculateAllTransparencyScores();

    // 3. Detect scam flags for each approved group
    const approvedGroups = await db
      .select({ id: signalGroups.id })
      .from(signalGroups)
      .where(eq(signalGroups.status, "approved"));

    const scamFlagResults = [];
    for (const group of approvedGroups) {
      const flags = await detectScamFlags(group.id);
      scamFlagResults.push({ groupId: group.id, flags });
    }

    return NextResponse.json({
      success: true,
      tiers: {
        updated: tierResults.length,
        results: tierResults,
      },
      transparency: {
        updated: transparencyResults.length,
        results: transparencyResults,
      },
      scamDetection: {
        scanned: scamFlagResults.length,
        results: scamFlagResults,
      },
    });
  } catch (error) {
    console.error("[Cron] Recalculation failed:", error);
    return NextResponse.json(
      { error: "Recalculation failed" },
      { status: 500 }
    );
  }
}
