export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getGroupBySlug } from "@/actions/groups";
import { ReviewForm } from "./review-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WriteReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) notFound();

  return <ReviewForm groupId={group.id} groupName={group.name} slug={slug} />;
}
