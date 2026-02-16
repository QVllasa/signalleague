import { cn } from "@/lib/utils";

interface TrackRecordProps {
  stats: {
    total: number;
    wins: number;
    losses: number;
    breakeven: number;
    avgReturn: number;
    winRate: number | null;
  };
}

function TrackRecord({ stats }: TrackRecordProps) {
  if (stats.total === 0) {
    return (
      <div className="rounded border border-border bg-surface-1 p-6 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          No community-verified trades yet.
        </p>
      </div>
    );
  }

  const winPct = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
  const breakevenPct =
    stats.total > 0 ? (stats.breakeven / stats.total) * 100 : 0;
  const lossPct = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;

  return (
    <div className="rounded border border-border bg-surface-1 p-4">
      {/* Header */}
      <h3 className="mb-3 font-heading text-xs uppercase tracking-wider text-muted-foreground">
        Community-Verified Track Record
      </h3>

      {/* Stats Grid */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {/* Win Rate */}
        <div className="rounded border border-border bg-surface-1 p-3 text-center">
          <p className="font-mono text-xs text-muted-foreground">Win Rate</p>
          <p
            className={cn(
              "mt-1 font-heading text-lg font-bold",
              stats.winRate == null
                ? "text-muted-foreground"
                : stats.winRate >= 60
                  ? "text-green-400"
                  : stats.winRate >= 40
                    ? "text-yellow-400"
                    : "text-red-400"
            )}
          >
            {stats.winRate != null ? `${stats.winRate}%` : "N/A"}
          </p>
        </div>

        {/* Trades Rated */}
        <div className="rounded border border-border bg-surface-1 p-3 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            Trades Rated
          </p>
          <p className="mt-1 font-heading text-lg font-bold text-foreground">
            {stats.total}
          </p>
        </div>

        {/* Avg Return */}
        <div className="rounded border border-border bg-surface-1 p-3 text-center">
          <p className="font-mono text-xs text-muted-foreground">Avg Return</p>
          <p
            className={cn(
              "mt-1 font-heading text-lg font-bold",
              stats.avgReturn >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {stats.avgReturn >= 0 ? "+" : ""}
            {stats.avgReturn}%
          </p>
        </div>
      </div>

      {/* Win/Loss Bar */}
      <div className="mb-2">
        <div className="flex h-3 w-full overflow-hidden rounded-sm">
          {winPct > 0 && (
            <div
              className="bg-green-500 transition-all duration-300"
              style={{ width: `${winPct}%` }}
            />
          )}
          {breakevenPct > 0 && (
            <div
              className="bg-gray-500 transition-all duration-300"
              style={{ width: `${breakevenPct}%` }}
            />
          )}
          {lossPct > 0 && (
            <div
              className="bg-red-500 transition-all duration-300"
              style={{ width: `${lossPct}%` }}
            />
          )}
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
          <span className="text-green-400">W: {stats.wins}</span>
          <span className="text-gray-400">BE: {stats.breakeven}</span>
          <span className="text-red-400">L: {stats.losses}</span>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
        Based on {stats.total} community-submitted trade outcome
        {stats.total !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
TrackRecord.displayName = "TrackRecord";

export { TrackRecord };
export type { TrackRecordProps };
