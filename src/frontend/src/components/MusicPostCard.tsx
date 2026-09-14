import type { PostView } from "@/backend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useCommentCount } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import PostActions from "./PostActions";

interface MusicPostCardProps {
  post: PostView;
  onPlay: (post: PostView) => void;
  onLike: (post: PostView) => void;
  onRepost: (post: PostView) => void;
  onShare: (post: PostView) => void;
  onDownload: (post: PostView) => void;
  onDelete: (post: PostView) => void;
}

export default function MusicPostCard({
  post,
  onPlay,
  onLike,
  onRepost,
  onShare,
  onDownload,
  onDelete,
}: MusicPostCardProps) {
  const { currentTrack, isPlaying, togglePlay } = useAudioPlayer();
  const { identity } = useInternetIdentity();
  const { data: commentCount } = useCommentCount(post.id);
  const isCurrent = currentTrack?.id === post.id.toString();
  const isThisPlaying = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else onPlay(post);
  };

  const uploaderShort = post.uploader.toString();
  const canDelete =
    !!identity &&
    post.uploader.toString() === identity.getPrincipal().toString();

  return (
    <article
      className="rounded-2xl border border-border/60 bg-card p-4 shadow-subtle"
      data-ocid="post.card"
    >
      <div className="flex gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gradient-primary">
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold text-primary-foreground/90">
            {post.title.slice(0, 2).toUpperCase()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePlay}
            className="absolute inset-0 size-full rounded-none bg-black/30 text-white hover:bg-black/40"
            aria-label={isThisPlaying ? "Pause" : "Play"}
            data-ocid="post.play_button"
          >
            {isThisPlaying ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6" />
            )}
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold uppercase tracking-wide">
            {post.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {post.caption}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              to="/profile/$principal"
              params={{ principal: uploaderShort }}
              className="flex min-w-0 items-center gap-2 rounded-full transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`View ${uploaderShort.slice(0, 10)}'s profile`}
              data-ocid="post.uploader_link"
            >
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/20 text-[10px] font-display text-primary">
                  {uploaderShort.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">
                {uploaderShort.slice(0, 10)}
              </span>
            </Link>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Play className="size-3" />
              {post.playCount.toString()} plays
            </span>
          </div>
        </div>
      </div>

      <PostActions
        post={post}
        commentCount={commentCount ?? 0n}
        onLike={onLike}
        onRepost={onRepost}
        onShare={onShare}
        onDownload={onDownload}
        onDelete={onDelete}
        canDelete={canDelete}
      />
    </article>
  );
}
