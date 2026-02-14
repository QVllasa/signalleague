import { NextResponse } from "next/server";
import { initMeiliSearch } from "@/lib/meilisearch";
import { syncAllGroupsToSearch } from "@/lib/sync-search";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { success } = await rateLimit("cron:search-sync", 10, 60);
  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Initialize MeiliSearch settings
    await initMeiliSearch();

    // Sync all groups
    const count = await syncAllGroupsToSearch();

    return NextResponse.json({ success: true, synced: count });
  } catch (error) {
    console.error("[Search Sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
