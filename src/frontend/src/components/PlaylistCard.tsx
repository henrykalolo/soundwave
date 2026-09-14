import type { PlaylistView } from "@/backend";
import { ListMusic } from "lucide-react";

function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "Recently";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlaylistCard({
  playlist,
}: {
  playlist: PlaylistView;
}) {
  const trackCount = playlist.trackIds.length;

  return (
    <div className="playlist-card" data-ocid="playlists.playlist_item">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-playlist-accent/20 text-playlist-accent">
          <ListMusic className="size-6" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">
            {playlist.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {trackCount.toString()} {trackCount === 1 ? "track" : "tracks"}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Created {formatDate(playlist.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
