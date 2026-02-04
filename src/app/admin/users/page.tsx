export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminUsersPage() {
  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Manage <span className="text-tertiary">Users</span>
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Name
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Email
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Role
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Rep
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border/50 hover:bg-surface-1 transition-colors"
              >
                <td className="py-2 px-3 text-xs text-foreground font-mono">
                  {user.name || "—"}
                </td>
                <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                  {user.email}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-[10px] font-heading tracking-wider ${
                      user.role === "admin"
                        ? "text-destructive"
                        : user.role === "moderator"
                          ? "text-secondary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs text-primary font-mono">
                  {user.reputationScore}
                </td>
                <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
