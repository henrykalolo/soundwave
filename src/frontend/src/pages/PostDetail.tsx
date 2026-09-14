import { createActor } from "@/backend";
import CommentsSection from "@/components/CommentsSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Play } from "lucide-react";

function shortPrincipal(principal: string): string {
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

export default function PostDetail() {
  const { postId } = useParams({ from: "/post/$postId" });
  const { actor, isFetching } = useActor(createActor);
  const { playTrack } = useAudioPlayer();
  const id = BigInt(postId);

  const postQuery = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPost(id);
    },
    enabled: !!actor && !isFetching,
  });

  const post = postQuery.data;

  const handlePlay = () => {
    if (!post) return;
    const uploader = post.uploader.toString();
    playTrack({
      id: post.id.toString(),
      title: post.title,
      artist: shortPrincipal(uploader),
      caption: post.caption,
      uploader: {
        principal: uploader,
        name: shortPrincipal(uploader),
        handle: uploader.slice(0, 6),
        bio: "",
        avatar: null,
        followerCount: 0n,
        followingCount: 0n,
      },
      audio: post.audio,
      artwork: null,
      playCount: post.playCount,
      likeCount: post.likeCount,
      repostCount: post.repostCount,
      createdAt: post.createdAt,
      likedByMe: post.likedByCaller,
      repostedByMe: post.repostedByCaller,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" data-ocid="post.page">
      <Link
        to="/"
        data-ocid="post.back_link"
        className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to feed
      </Link>

      {postQuery.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : postQuery.isError || !post ? (
        <div
          className="rounded-2xl border border-border/60 bg-card p-8 text-center"
          data-ocid="post.error_state"
        >
          <p className="font-display text-lg font-semibold">
            Couldn&apos;t load this track
          </p>
        </div>
      ) : (
        <article
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-subtle"
          data-ocid="post.card"
        >
          <div className="flex items-start gap-4">
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
                aria-label="Play"
                data-ocid="post.play_button"
              >
                <Play className="size-6" />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-bold uppercase tracking-wide">
                {post.title}
              </h1>
              <Link
                to="/profile/$principal"
                params={{ principal: post.uploader.toString() }}
                className="mt-1 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
                data-ocid="post.uploader_link"
              >
                {shortPrincipal(post.uploader.toString())}
              </Link>
              {post.caption && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/80">
                  {post.caption}
                </p>
              )}
              <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Play className="size-3" />
                  {post.playCount.toString()} plays
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  Comments
                </span>
              </div>
            </div>
          </div>
        </article>
      )}

      <CommentsSection postId={id} />
    </div>
  );
}
