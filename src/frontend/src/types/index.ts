import type { ExternalBlob } from "@caffeineai/object-storage";
import type { Principal } from "@icp-sdk/core/principal";

export interface UserProfile {
  principal: string;
  name: string;
  handle: string;
  bio: string;
  avatar: ExternalBlob | null;
  followerCount: bigint;
  followingCount: bigint;
}

export interface MusicPost {
  id: string;
  title: string;
  artist: string;
  caption: string;
  uploader: UserProfile;
  audio: ExternalBlob;
  artwork: ExternalBlob | null;
  playCount: bigint;
  likeCount: bigint;
  repostCount: bigint;
  createdAt: bigint;
  likedByMe: boolean;
  repostedByMe: boolean;
}

export type FeedTab = "forYou" | "following";

export interface Conversation {
  id: bigint;
  lastMessageAt?: bigint;
  lastMessage?: string;
  otherUser: Principal;
  unreadCount: bigint;
}

export interface Message {
  id: bigint;
  createdAt: bigint;
  text: string;
  sender: Principal;
}

export interface Comment {
  id: bigint;
  createdAt: bigint;
  text: string;
  author: Principal;
  replyCount: bigint;
  parentId?: bigint;
  postId: bigint;
}

export interface Playlist {
  id: bigint;
  name: string;
  createdAt: bigint;
  trackIds: bigint[];
}
