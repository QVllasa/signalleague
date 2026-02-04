import { NextResponse } from "next/server";
import { initMeiliSearch } from "@/lib/meilisearch";
import { syncAllGroupsToSearch } from "@/lib/sync-search";

export async function POST(request: Request) {
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
