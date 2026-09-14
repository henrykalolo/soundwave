import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface PlaylistView {
    id: PlaylistId;
    name: string;
    createdAt: bigint;
    trackIds: Array<PostId>;
}
export type CommentId = bigint;
export type PostId = bigint;
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface PostView {
    id: PostId;
    title: string;
    likeCount: bigint;
    audio: ExternalBlob;
    repostCount: bigint;
    createdAt: bigint;
    repostedByCaller: boolean;
    playCount: bigint;
    filename: string;
    caption: string;
    uploader: Principal;
    likedByCaller: boolean;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface ConversationView {
    id: ConversationId;
    lastMessageAt?: bigint;
    lastMessage?: string;
    otherUser: Principal;
    unreadCount: bigint;
}
export type ConversationId = bigint;
export interface CommentView {
    id: CommentId;
    createdAt: bigint;
    text: string;
    author: Principal;
    replyCount: bigint;
    parentId?: CommentId;
    postId: PostId;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface FeedPage {
    posts: Array<PostView>;
    nextCursor?: PostId;
}
export type MessageId = bigint;
export type PlaylistId = bigint;
export interface MessageView {
    id: MessageId;
    createdAt: bigint;
    text: string;
    sender: Principal;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface UserProfile {
    principal: Principal;
    isFollowing: boolean;
    followerCount: bigint;
    followingCount: bigint;
}
export enum FeedFilter {
    following = "following",
    forYou = "forYou"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: PostId, text: string): Promise<CommentId>;
    addTrackToPlaylist(playlistId: PlaylistId, postId: PostId): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPlaylist(name: string): Promise<PlaylistId>;
    deletePost(postId: PostId): Promise<void>;
    execute(qJson: string): Promise<Result>;
    followUser(target: Principal): Promise<void>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentCount(postId: PostId): Promise<bigint>;
    getComments(postId: PostId): Promise<Array<CommentView>>;
    getConversation(conversationId: ConversationId): Promise<Array<MessageView> | null>;
    getConversations(): Promise<Array<ConversationView>>;
    getFeed(filter: FeedFilter, cursor: PostId | null, limit: bigint): Promise<FeedPage>;
    getPlaylists(principal: Principal): Promise<Array<PlaylistView>>;
    getPost(postId: PostId): Promise<PostView | null>;
    getProfile(principal: Principal): Promise<UserProfile>;
    getRecommendations(limit: bigint): Promise<Array<PostView>>;
    getUserPosts(principal: Principal): Promise<Array<PostView>>;
    getUserReposts(principal: Principal): Promise<Array<PostView>>;
    isCallerAdmin(): Promise<boolean>;
    likePost(postId: PostId): Promise<void>;
    markConversationRead(conversationId: ConversationId): Promise<void>;
    recordPlay(postId: PostId): Promise<void>;
    replyToComment(postId: PostId, parentId: CommentId, text: string): Promise<CommentId>;
    repostPost(postId: PostId): Promise<void>;
    schema(): Promise<string>;
    sendMessage(conversationId: ConversationId, text: string): Promise<MessageId>;
    startConversation(other: Principal): Promise<ConversationId>;
    unfollowUser(target: Principal): Promise<void>;
    unlikePost(postId: PostId): Promise<void>;
    unrepostPost(postId: PostId): Promise<void>;
    uploadPost(title: string, caption: string, audio: ExternalBlob, filename: string): Promise<PostId>;
}
