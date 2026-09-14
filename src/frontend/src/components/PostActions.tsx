import type { PostView } from "@/backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddTrackToPlaylist, usePlaylists } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Download,
  Heart,
  ListMusic,
  ListPlus,
  MessageCircle,
  Repeat2,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PostActionsProps {
  post: PostView;
  commentCount: bigint;
  onLike: (post: PostView) => void;
  onRepost: (post: PostView) => void;
  onShare: (post: PostView) => void;
  onDownload: (post: PostView) => void;
  onDelete: (post: PostView) => void;
  canDelete: boolean;
}

export default function PostActions({
  post,
  commentCount,
  onLike,
  onRepost,
  onShare,
  onDownload,
  onDelete,
  canDelete,
}: PostActionsProps) {
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<bigint | null>(
    null,
  );
  const { isAuthenticated, identity, login } = useInternetIdentity();
  const principal = identity?.getPrincipal() ?? null;
  const { data: playlists, isLoading } = usePlaylists(principal);
  const addTrack = useAddTrackToPlaylist(selectedPlaylistId ?? 0n);

  useEffect(() => {
    if (selectedPlaylistId === null) return;
    addTrack.mutate(post.id);
    setSelectedPlaylistId(null);
    setPickerOpen(false);
  }, [selectedPlaylistId, addTrack, post.id]);

  const handleShare = () => {
    onShare(post);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToPlaylist = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    setPickerOpen(true);
  };

  const handleSelectPlaylist = (playlistId: bigint) => {
    setSelectedPlaylistId(playlistId);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-3">
        <button
          type="button"
          onClick={() => onRepost(post)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          aria-label={post.repostedByCaller ? "Undo repost" : "Repost"}
          data-ocid="post.repost_button"
        >
          <Repeat2
            className={`size-4 transition-transform active:scale-125 ${
              post.repostedByCaller ? "text-primary" : ""
            }`}
          />
          <span className="tabular-nums">{post.repostCount.toString()}</span>
        </button>

        <button
          type="button"
          onClick={() => onLike(post)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent"
          aria-label={post.likedByCaller ? "Unlike" : "Like"}
          data-ocid="post.like_button"
        >
          <Heart
            className={`size-4 transition-all active:scale-125 ${
              post.likedByCaller ? "fill-accent text-accent" : ""
            }`}
          />
          <span className="tabular-nums">{post.likeCount.toString()}</span>
        </button>

        <Link
          to="/post/$postId"
          params={{ postId: post.id.toString() }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          aria-label={`${commentCount.toString()} comments`}
          data-ocid="post.comment_button"
        >
          <MessageCircle className="size-4" />
          <span className="tabular-nums">{commentCount.toString()}</span>
        </Link>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          aria-label="Share post"
          data-ocid="post.share_button"
        >
          {copied ? (
            <Check className="size-4 text-success" />
          ) : (
            <Share2 className="size-4" />
          )}
          <span>{copied ? "Copied" : "Share"}</span>
        </button>

        <button
          type="button"
          onClick={() => onDownload(post)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          aria-label="Download audio"
          data-ocid="post.download_button"
        >
          <Download className="size-4" />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={handleAddToPlaylist}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          aria-label="Add to playlist"
          data-ocid="post.add_to_playlist_button"
        >
          <ListPlus className="size-4" />
          <span>Playlist</span>
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(post)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Delete post"
            data-ocid="post.delete_button"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </button>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent data-ocid="post.playlist_picker">
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription>
              Save “{post.title}” to one of your playlists.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p
              className="text-sm text-muted-foreground"
              data-ocid="post.playlist_loading"
            >
              Loading your playlists…
            </p>
          ) : !playlists || playlists.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-border p-6 text-center"
              data-ocid="post.playlist_empty"
            >
              <ListMusic className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 font-display text-sm font-semibold">
                No playlists yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a playlist on your profile to start collecting tracks.
              </p>
            </div>
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id.toString()}
                  type="button"
                  onClick={() => handleSelectPlaylist(playlist.id)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-playlist-accent/50 hover:bg-muted/60"
                  data-ocid="post.playlist_option"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-playlist-accent/20 text-playlist-accent">
                    <ListMusic className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {playlist.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {playlist.trackIds.length.toString()}{" "}
                      {playlist.trackIds.length === 1 ? "track" : "tracks"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
