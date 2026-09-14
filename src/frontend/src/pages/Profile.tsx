import { createActor } from "@/backend";
import type { PostView } from "@/backend";
import ProfileHeader from "@/components/ProfileHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePlaylists, useStartConversation } from "@/hooks/useQueries";
import type { MusicPost } from "@/types";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  BarChart3,
  Heart,
  ListMusic,
  MessageCircle,
  Play,
  Repeat2,
} from "lucide-react";
import { useState } from "react";

type ProfileTab = "posts" | "reposts" | "playlists";

function shortPrincipal(principal: string): string {
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

function toMusicPost(post: PostView): MusicPost {
  const uploader = post.uploader.toString();
  return {
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
  };
}

function PostCard({ post }: { post: PostView }) {
  const { playTrack } = useAudioPlayer();
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);
  const track = toMusicPost(post);

  const recordPlayMutation = useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.recordPlay(postId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      void queryClient.invalidateQueries({ queryKey: ["userReposts"] });
    },
  });

  return (
    <article
      className="flex gap-3 rounded-2xl border border-border bg-card p-4"
      data-ocid="profile.post_card"
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-primary/20 font-display text-primary">
          {post.title.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold uppercase">
              {post.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {shortPrincipal(post.uploader.toString())}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              playTrack(track);
              recordPlayMutation.mutate(post.id);
            }}
            aria-label={`Play ${post.title}`}
            data-ocid="profile.play_button"
          >
            <Play className="size-5 text-primary" />
          </Button>
        </div>

        {post.caption && (
          <p className="mt-2 text-sm text-foreground/80">{post.caption}</p>
        )}

        <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Repeat2 className="size-4" />
            {post.repostCount.toString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-4" />
            {post.likeCount.toString()}
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="size-4" />
            {post.playCount.toString()}
          </span>
        </div>
      </div>
    </article>
  );
}

function PostListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((id) => (
        <Skeleton key={id} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function PostList({
  posts,
  isLoading,
  isEmpty,
  emptyTitle,
  emptyMessage,
}: {
  posts: PostView[];
  isLoading: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (isLoading) return <PostListSkeleton />;

  if (isEmpty) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center"
        data-ocid="profile.empty_state"
      >
        <p className="font-display text-base font-semibold">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id.toString()} post={post} />
      ))}
    </div>
  );
}

function PlaylistsList({
  playlists,
  isLoading,
  isError,
  onRetry,
}: {
  playlists: { id: bigint; name: string; trackIds: bigint[] }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
          <Skeleton key={id} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="rounded-2xl border border-border/60 bg-card p-8 text-center"
        data-ocid="profile.playlists_error_state"
      >
        <p className="font-display text-lg font-semibold">
          Couldn&apos;t load playlists
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onRetry}
          data-ocid="profile.playlists_retry_button"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center"
        data-ocid="profile.playlists_empty_state"
      >
        <ListMusic className="size-10 text-muted-foreground" />
        <p className="font-display text-base font-semibold">No playlists yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first playlist to start collecting tracks.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {playlists.map((playlist) => (
        <div
          key={playlist.id.toString()}
          className="playlist-card"
          data-ocid="profile.playlist_item"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-playlist-accent/20 text-playlist-accent">
              <ListMusic className="size-6" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold">
                {playlist.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {playlist.trackIds.length.toString()} tracks
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Profile() {
  const { principal: principalParam } = useParams({
    from: "/profile/$principal",
  });
  const { identity, isAuthenticated, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { actor, isFetching } = useActor(createActor);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [signInOpen, setSignInOpen] = useState(false);

  const principal = Principal.fromText(principalParam);
  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwnProfile = callerPrincipal === principalParam;

  const startConversation = useStartConversation();

  const profileQuery = useQuery({
    queryKey: ["profile", principalParam],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getProfile(principal);
    },
    enabled: !!actor && !isFetching,
  });

  const postsQuery = useQuery({
    queryKey: ["userPosts", principalParam],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getUserPosts(principal);
    },
    enabled: !!actor && !isFetching,
  });

  const repostsQuery = useQuery({
    queryKey: ["userReposts", principalParam],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getUserReposts(principal);
    },
    enabled: !!actor && !isFetching,
  });

  const playlistsQuery = usePlaylists(isOwnProfile ? principal : null);

  const handleMessage = () => {
    if (!isAuthenticated) {
      setSignInOpen(true);
      return;
    }
    startConversation.mutate(principal, {
      onSuccess: (conversationId) => {
        navigate({
          to: "/messages/$conversationId",
          params: { conversationId: conversationId.toString() },
        });
      },
    });
  };

  const loading = profileQuery.isLoading;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" data-ocid="profile.page">
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <div className="mt-6 w-full space-y-3">
            {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((id) => (
              <Skeleton key={id} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : profileQuery.isError || !profileQuery.data ? (
        <div
          className="flex flex-col items-center gap-3 py-16 text-center"
          data-ocid="profile.error_state"
        >
          <p className="font-display text-lg font-semibold">
            Couldn&apos;t load this profile
          </p>
          <p className="text-sm text-muted-foreground">
            The profile may not exist or the network is unavailable.
          </p>
        </div>
      ) : (
        <>
          <ProfileHeader
            profile={profileQuery.data}
            isOwnProfile={isOwnProfile}
          />

          {!isOwnProfile && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleMessage}
                disabled={startConversation.isPending}
                data-ocid="profile.message_button"
              >
                <MessageCircle className="size-4" />
                {startConversation.isPending ? "Starting…" : "Message"}
              </Button>
            </div>
          )}

          <section className="mt-6" data-ocid="profile.posts_section">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ProfileTab)}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="posts" data-ocid="profile.tab.posts">
                  Posts
                </TabsTrigger>
                <TabsTrigger value="reposts" data-ocid="profile.tab.reposts">
                  Reposts
                </TabsTrigger>
                {isOwnProfile && (
                  <TabsTrigger
                    value="playlists"
                    data-ocid="profile.tab.playlists"
                  >
                    Playlists
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="posts" className="mt-4">
                <PostList
                  posts={postsQuery.data ?? []}
                  isLoading={postsQuery.isLoading}
                  isEmpty={!postsQuery.data || postsQuery.data.length === 0}
                  emptyTitle="No uploads yet"
                  emptyMessage={
                    isOwnProfile
                      ? "Share your first track to get started."
                      : "This user hasn't shared any tracks yet."
                  }
                />
              </TabsContent>

              <TabsContent value="reposts" className="mt-4">
                <PostList
                  posts={repostsQuery.data ?? []}
                  isLoading={repostsQuery.isLoading}
                  isEmpty={!repostsQuery.data || repostsQuery.data.length === 0}
                  emptyTitle="No reposts yet"
                  emptyMessage={
                    isOwnProfile
                      ? "Repost tracks you love to surface them here."
                      : "This user hasn't reposted any tracks yet."
                  }
                />
              </TabsContent>

              {isOwnProfile && (
                <TabsContent value="playlists" className="mt-4">
                  <PlaylistsList
                    playlists={playlistsQuery.data ?? []}
                    isLoading={playlistsQuery.isLoading}
                    isError={playlistsQuery.isError}
                    onRetry={() => playlistsQuery.refetch()}
                  />
                </TabsContent>
              )}
            </Tabs>
          </section>
        </>
      )}

      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent data-ocid="profile.signin_dialog">
          <DialogHeader>
            <DialogTitle>Sign in to message</DialogTitle>
            <DialogDescription>
              Start a private conversation with this user. Sign in with Internet
              Identity to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSignInOpen(false)}
              data-ocid="profile.signin_cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => login()}
              disabled={isInitializing || isLoggingIn}
              data-ocid="profile.signin_button"
            >
              {isLoggingIn ? "Signing in…" : "Sign in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
