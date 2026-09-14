import { createActor } from "@/backend";
import type { UserProfile } from "@/backend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus } from "lucide-react";

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
}: ProfileHeaderProps) {
  const { isAuthenticated } = useInternetIdentity();
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const principal = profile.principal.toString();

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      if (profile.isFollowing) {
        await actor.unfollowUser(profile.principal);
      } else {
        await actor.followUser(profile.principal);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", principal] });
      void queryClient.invalidateQueries({
        queryKey: ["userPosts", principal],
      });
    },
  });

  const showFollow = isAuthenticated && !isOwnProfile;

  return (
    <div
      className="flex flex-col items-center gap-4 border-b border-border px-4 py-8 text-center"
      data-ocid="profile.header"
    >
      <Avatar className="size-20">
        <AvatarFallback className="bg-primary/20 font-display text-2xl text-primary">
          {principal.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold">
          {principal.slice(0, 8)}…{principal.slice(-4)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{principal.slice(0, 6)}
        </p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="font-display font-bold">
            {profile.followingCount.toString()}
          </span>
          <span className="ml-1 text-muted-foreground">Following</span>
        </div>
        <div>
          <span className="font-display font-bold">
            {profile.followerCount.toString()}
          </span>
          <span className="ml-1 text-muted-foreground">Followers</span>
        </div>
      </div>

      {showFollow && (
        <Button
          type="button"
          variant={profile.isFollowing ? "outline" : "default"}
          onClick={() => followMutation.mutate()}
          disabled={followMutation.isPending}
          data-ocid="profile.follow_button"
        >
          {profile.isFollowing ? (
            <UserCheck className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {profile.isFollowing ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}
