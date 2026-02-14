import { NextResponse } from "next/server";
import { recalculateAllTiers } from "@/lib/ranking";
import { rateLimit } from "@/lib/rate-limit";

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
    const results = await recalculateAllTiers();
    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error("[Cron] Tier recalculation failed:", error);
    return NextResponse.json(
      { error: "Recalculation failed" },
      { status: 500 }
    );
  }
}
