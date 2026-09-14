import { createActor } from "@/backend";
import type { UserRole } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCallerRole() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserRole | null>({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Conversations
export function useConversations() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useConversation(conversationId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["conversation", conversationId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getConversation(conversationId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStartConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (other: Principal) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.startConversation(other);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage(conversationId: bigint) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.sendMessage(conversationId, text);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId.toString()],
      });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead(conversationId: bigint) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.markConversationRead(conversationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Comments
export function useComments(postId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["comments", postId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCommentCount(postId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["commentCount", postId.toString()],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getCommentCount(postId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddComment(postId: bigint) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addComment(postId, text);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
      void queryClient.invalidateQueries({
        queryKey: ["commentCount", postId.toString()],
      });
    },
  });
}

export function useReplyToComment(postId: bigint, parentId: bigint) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.replyToComment(postId, parentId, text);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
      void queryClient.invalidateQueries({
        queryKey: ["commentCount", postId.toString()],
      });
    },
  });
}

// Playlists
export function usePlaylists(principal: Principal | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["playlists", principal?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getPlaylists(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useCreatePlaylist() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createPlaylist(name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useAddTrackToPlaylist(playlistId: bigint) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addTrackToPlaylist(playlistId, postId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

// Recommendations
export function useRecommendations(limit: bigint, enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["recommendations", limit.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecommendations(limit);
    },
    enabled: !!actor && !isFetching && enabled,
  });
}
