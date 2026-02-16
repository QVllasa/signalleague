"use server";

import { z } from "zod";
import { db } from "@/db";
import { signalGroups } from "@/db/schema";
import { eq, desc, and, or, sql, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const submitGroupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  platform: z.enum(["twitter", "discord", "telegram"]),
  platformHandle: z.string().min(1, "Platform handle is required").max(255),
  platformUrl: z.string().url("Please enter a valid URL").max(512),
  assetClass: z.enum(["crypto"]).default("crypto"),
  pricingModel: z.enum(["free", "paid", "freemium"]),
  price: z.string().optional(),
  estimatedMembers: z.coerce.number().int().min(0).optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function submitGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to submit a group" };
  }

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    platform: formData.get("platform") as string,
    platformHandle: formData.get("platformHandle") as string,
    platformUrl: formData.get("platformUrl") as string,
    pricingModel: formData.get("pricingModel") as string,
    price: formData.get("price") as string,
    estimatedMembers: formData.get("estimatedMembers") as string,
  };

  const parsed = submitGroupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const baseSlug = slugify(data.name);
  let slug = baseSlug;

  // Ensure unique slug
  let attempt = 0;
  while (attempt < 10) {
    const existing = await db
      .select({ id: signalGroups.id })
      .from(signalGroups)
      .where(eq(signalGroups.slug, slug))
      .limit(1);

    if (existing.length === 0) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  try {
    // Fuzzy dedup check: look for existing groups with similar name or handle
    const potentialDuplicates = await db
      .select({
        id: signalGroups.id,
        name: signalGroups.name,
        platformHandle: signalGroups.platformHandle,
        status: signalGroups.status,
      })
      .from(signalGroups)
      .where(
        or(
          ilike(signalGroups.name, `%${data.name}%`),
          ilike(signalGroups.platformHandle, `%${data.platformHandle}%`)
        )
      );

    const [group] = await db
      .insert(signalGroups)
      .values({
        name: data.name,
        slug,
        description: data.description,
        platform: data.platform,
        platformHandle: data.platformHandle,
        platformUrl: data.platformUrl,
        assetClass: data.assetClass,
        pricingModel: data.pricingModel,
        price: data.price || null,
        estimatedMembers: data.estimatedMembers || null,
        submittedBy: session.user.id,
        status: "pending",
      })
      .returning();

    revalidatePath("/groups");
    revalidatePath("/admin/groups");
    return {
      success: true,
      slug: group.slug,
      potentialDuplicates: potentialDuplicates.length,
    };
  } catch (error) {
    console.error("[Groups] Submit error:", error);
    return { error: "Failed to submit group. Please try again." };
  }
}

export async function getGroups({
  search,
  platform,
  pricingModel,
  sortBy = "avgScore",
  page = 1,
  limit = 12,
}: {
  search?: string;
  platform?: string;
  pricingModel?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = [eq(signalGroups.status, "approved")];

  if (search) {
    conditions.push(ilike(signalGroups.name, `%${search}%`));
  }
  if (platform && ["twitter", "discord", "telegram"].includes(platform)) {
    conditions.push(eq(signalGroups.platform, platform as "twitter" | "discord" | "telegram"));
  }
  if (pricingModel && ["free", "paid", "freemium"].includes(pricingModel)) {
    conditions.push(eq(signalGroups.pricingModel, pricingModel as "free" | "paid" | "freemium"));
  }

  const orderMap: Record<string, ReturnType<typeof desc>> = {
    avgScore: desc(signalGroups.avgScore),
    reviewCount: desc(signalGroups.reviewCount),
    newest: desc(signalGroups.createdAt),
    name: desc(signalGroups.name),
  };

  const orderBy = orderMap[sortBy] || orderMap.avgScore;

  const [groups, [{ total }]] = await Promise.all([
    db
      .select()
      .from(signalGroups)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(signalGroups)
      .where(and(...conditions)),
  ]);

  return {
    groups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getGroupBySlug(slug: string) {
  const [group] = await db
    .select()
    .from(signalGroups)
    .where(eq(signalGroups.slug, slug))
    .limit(1);

  return group || null;
}
