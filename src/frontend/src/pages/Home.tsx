import { createActor } from "@/backend";
import type { FeedPage, PostView } from "@/backend";
import { FeedFilter } from "@/backend";
import FeedTabs from "@/components/FeedTabs";
import MusicPostCard from "@/components/MusicPostCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useRecommendations } from "@/hooks/useQueries";
import type { MusicPost } from "@/types";
import type { FeedTab } from "@/types";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toMusicPost(post: PostView): MusicPost {
  const principal = post.uploader.toString();
  return {
    id: post.id.toString(),
    title: post.title,
    artist: post.caption,
    caption: post.caption,
    uploader: {
      principal,
      name: principal.slice(0, 8),
      handle: principal.slice(0, 8),
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
  };
}

function usePostMutation(
  method:
    | "likePost"
    | "unlikePost"
    | "repostPost"
    | "unrepostPost"
    | "recordPlay",
) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor[method](postId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

function useDeletePost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
        <div
          key={id}
          className="rounded-2xl border border-border/60 bg-card p-4"
        >
          <div className="flex gap-4">
            <Skeleton className="size-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated, login } = useInternetIdentity();
  const { playTrack } = useAudioPlayer();
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");

  const likeMutation = usePostMutation("likePost");
  const unlikeMutation = usePostMutation("unlikePost");
  const repostMutation = usePostMutation("repostPost");
  const unrepostMutation = usePostMutation("unrepostPost");
  const recordPlayMutation = usePostMutation("recordPlay");
  const deleteMutation = useDeletePost();

  const recommendationsQuery = useRecommendations(5n, isAuthenticated);

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", activeTab],
    queryFn: async ({ pageParam }) => {
      if (!actor) return { posts: [], nextCursor: undefined } as FeedPage;
      const filter =
        activeTab === "forYou" ? FeedFilter.forYou : FeedFilter.following;
      return actor.getFeed(filter, pageParam ?? null, 20n);
    },
    initialPageParam: null as bigint | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!actor && !isFetching,
  });

  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((p) => p.posts) ?? [],
    [feedQuery.data],
  );

  const handlePlay = useCallback(
    (post: PostView) => {
      playTrack(toMusicPost(post), posts.map(toMusicPost));
      recordPlayMutation.mutate(post.id);
    },
    [playTrack, posts, recordPlayMutation],
  );

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!isAuthenticated) {
        login();
        return;
      }
      action();
    },
    [isAuthenticated, login],
  );

  const handleLike = useCallback(
    (post: PostView) => {
      requireAuth(() => {
        if (post.likedByCaller) unlikeMutation.mutate(post.id);
        else likeMutation.mutate(post.id);
      });
    },
    [requireAuth, likeMutation, unlikeMutation],
  );

  const handleRepost = useCallback(
    (post: PostView) => {
      requireAuth(() => {
        if (post.repostedByCaller) unrepostMutation.mutate(post.id);
        else repostMutation.mutate(post.id);
      });
    },
    [requireAuth, repostMutation, unrepostMutation],
  );

  const handleShare = useCallback(async (post: PostView) => {
    const url = `${window.location.origin}/?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard unavailable; ignore.
    }
  }, []);

  const handleDownload = useCallback((post: PostView) => {
    const a = document.createElement("a");
    a.href = post.audio.getDirectURL();
    a.download = post.filename;
    a.click();
  }, []);

  const handleDelete = useCallback(
    (post: PostView) => {
      requireAuth(() => deleteMutation.mutate(post.id));
    },
    [requireAuth, deleteMutation],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        feedQuery.hasNextPage &&
        !feedQuery.isFetchingNextPage
      ) {
        void feedQuery.fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    feedQuery.hasNextPage,
    feedQuery.isFetchingNextPage,
    feedQuery.fetchNextPage,
  ]);

  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) pullStartRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStartRef.current === null) return;
    const delta = e.touches[0].clientY - pullStartRef.current;
    if (delta > 0) setPullDistance(Math.min(delta * 0.5, 80));
  };
  const onTouchEnd = () => {
    if (pullStartRef.current !== null && pullDistance >= 60) {
      void feedQuery.refetch();
    }
    pullStartRef.current = null;
    setPullDistance(0);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" data-ocid="home.page">
      <h1 className="mb-4 font-display text-2xl font-bold">Home</h1>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">Drop a track</p>
          <p className="truncate text-sm text-muted-foreground">
            Share your latest music with the feed.
          </p>
        </div>
        <Link
          to="/upload"
          data-ocid="home.upload_link"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Upload
        </Link>
      </div>

      <FeedTabs value={activeTab} onChange={setActiveTab} />

      {isAuthenticated && (
        <section
          className="mt-6"
          aria-labelledby="recommendations-heading"
          data-ocid="recommendations.section"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="recommendations-heading"
              className="font-display text-lg font-bold"
            >
              Recommended for you
            </h2>
            <span className="text-xs text-muted-foreground">
              Based on who you follow &amp; what you like
            </span>
          </div>

          {recommendationsQuery.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => `rec-skeleton-${i}`).map(
                (id) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-border/60 bg-recommend p-4"
                  >
                    <div className="flex gap-4">
                      <Skeleton className="size-20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : recommendationsQuery.isError ? (
            <div
              className="rounded-2xl border border-border/60 bg-recommend p-6 text-center"
              data-ocid="recommendations.error_state"
            >
              <p className="font-display text-base font-semibold">
                Couldn't load recommendations
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => recommendationsQuery.refetch()}
                data-ocid="recommendations.retry_button"
              >
                Retry
              </Button>
            </div>
          ) : recommendationsQuery.data?.length ? (
            <div className="flex flex-col gap-3">
              {recommendationsQuery.data.map((post) => (
                <div key={post.id.toString()} className="recommend-card">
                  <MusicPostCard
                    post={post}
                    onPlay={handlePlay}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onShare={handleShare}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border border-border/60 bg-recommend p-6 text-center"
              data-ocid="recommendations.empty_state"
            >
              <p className="font-display text-base font-semibold">
                No recommendations yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow artists and like tracks to get personalized picks.
              </p>
            </div>
          )}
        </section>
      )}

      <div
        className="mt-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="mb-2 flex justify-center overflow-hidden"
            style={{ height: pullDistance }}
          >
            <RefreshCw className="size-5 animate-spin text-primary" />
          </div>
        )}

        {feedQuery.isLoading ? (
          <FeedSkeleton />
        ) : feedQuery.isError ? (
          <div
            className="rounded-2xl border border-border/60 bg-card p-8 text-center"
            data-ocid="feed.error_state"
          >
            <p className="font-display text-lg font-semibold">
              Couldn't load the feed
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong while fetching tracks.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => feedQuery.refetch()}
              data-ocid="feed.retry_button"
            >
              Retry
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div
            className="rounded-2xl border border-border/60 bg-card p-8 text-center"
            data-ocid="feed.empty_state"
          >
            <p className="font-display text-lg font-semibold">No tracks yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTab === "forYou"
                ? "Be the first to drop a track on SoundWave."
                : "Follow artists to see their tracks here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <MusicPostCard
                key={post.id.toString()}
                post={post}
                onPlay={handlePlay}
                onLike={handleLike}
                onRepost={handleRepost}
                onShare={handleShare}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
        {feedQuery.isFetchingNextPage && (
          <div
            className="mt-4 flex justify-center"
            data-ocid="feed.loading_state"
          >
            <RefreshCw className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
