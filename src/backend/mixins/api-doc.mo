mixin () {
  public query func getApiDoc() : async Text {
    "# SoundWave Backend API\n" #
    "\n" #
    "SoundWave is a music hosting app where each music upload is treated as a post (tweet) in a Twitter-like feed. Signed-in users upload audio with a title and caption to publish a post; any user can play, like, repost, download, and share posts, and follow other users. Audio files are stored via the platform object-storage service; the backend keeps the post metadata, engagement counts, and the social graph.\n" #
    "\n" #
    "## Public methods\n" #
    "\n" #
    "### Music feed and posts\n" #
    "- `uploadPost(title : Text, caption : Text, audio : ExternalBlob, filename : Text) : async PostId` — update. Publishes a new music post authored by the caller and returns its new `PostId`.\n" #
    "- `deletePost(postId : PostId) : async ()` — update. Deletes the post and its likes/reposts. Only the uploader may delete their own post.\n" #
    "- `getFeed(filter : FeedFilter, cursor : ?PostId, limit : Nat) : async FeedPage` — query. Returns a page of posts. With `#forYou` the feed is ordered by engagement (likes*2 + reposts*3 + plays) then recency; with `#following` it is ordered by recency and restricted to posts from users the caller follows (requires a signed-in caller).\n" #
    "- `getPost(postId : PostId) : async ?PostView` — query. Returns a single post view, or `null` if it does not exist.\n" #
    "\n" #
    "### Social interactions\n" #
    "- `likePost(postId : PostId) : async ()` — update. Likes a post (idempotent).\n" #
    "- `unlikePost(postId : PostId) : async ()` — update. Removes the caller's like (idempotent).\n" #
    "- `repostPost(postId : PostId) : async ()` — update. Reposts a post, surfacing it in the caller's profile feed (idempotent).\n" #
    "- `unrepostPost(postId : PostId) : async ()` — update. Removes the caller's repost (idempotent).\n" #
    "- `recordPlay(postId : PostId) : async ()` — update. Increments the post's play count by one.\n" #
    "- `followUser(target : Principal) : async ()` — update. Follows another user (idempotent). Cannot follow yourself.\n" #
    "- `unfollowUser(target : Principal) : async ()` — update. Unfollows another user (idempotent).\n" #
    "\n" #
    "### User profiles\n" #
    "- `getProfile(principal : Principal) : async UserProfile` — query. Returns follower/following counts and whether the caller follows that user.\n" #
    "- `getUserPosts(principal : Principal) : async [PostView]` — query. Returns the user's uploaded posts and reposted posts (deduplicated), newest first.\n" #
    "- `getUserReposts(principal : Principal) : async [PostView]` — query. Returns only the posts the user has reposted, newest first.\n" #
    "\n" #
    "### Private messaging\n" #
    "- `startConversation(other : Principal) : async ConversationId` — update. Starts (or returns the existing) private 1:1 conversation between the caller and `other`. Cannot start a conversation with yourself.\n" #
    "- `getConversations() : async [ConversationView]` — query. Returns all conversations the caller participates in, each with the other user, last message preview, timestamp, and unread count.\n" #
    "- `getConversation(conversationId : ConversationId) : async ?[MessageView]` — query. Returns the messages of a conversation in chronological order, or `null` if it does not exist. Only the two participants can read it.\n" #
    "- `sendMessage(conversationId : ConversationId, text : Text) : async MessageId` — update. Appends a text message to a conversation and bumps the other participant's unread count. Only participants can send.\n" #
    "- `markConversationRead(conversationId : ConversationId) : async ()` — update. Clears the caller's unread count for a conversation. Only participants can mark as read.\n" #
    "\n" #
    "### Comments\n" #
    "- `addComment(postId : PostId, text : Text) : async CommentId` — update. Adds a top-level comment to a post.\n" #
    "- `replyToComment(postId : PostId, parentId : CommentId, text : Text) : async CommentId` — update. Adds a threaded reply to an existing comment on the same post and increments the parent's reply count.\n" #
    "- `getComments(postId : PostId) : async [CommentView]` — query. Returns all comments (including replies) on a post, newest first.\n" #
    "- `getCommentCount(postId : PostId) : async Nat` — query. Returns the total number of comments and replies on a post.\n" #
    "\n" #
    "### Playlists\n" #
    "- `createPlaylist(name : Text) : async PlaylistId` — update. Creates a named playlist owned by the caller.\n" #
    "- `addTrackToPlaylist(playlistId : PlaylistId, postId : PostId) : async ()` — update. Adds a track (post) to a playlist the caller owns. Idempotent per track.\n" #
    "- `getPlaylists(principal : Principal) : async [PlaylistView]` — query. Returns the playlists owned by `principal`.\n" #
    "\n" #
    "### Recommendations\n" #
    "- `getRecommendations(limit : Nat) : async [PostView]` — query. Returns suggested posts the caller has not interacted with (not uploaded or liked by the caller), ranked by engagement plus a bonus for posts from followed users or liked by followed users.\n" #
    "\n" #
    "### Authorization\n" #
    "- `_initialize_access_control() : async ()` — update. Registers the caller. The first caller to register becomes admin; every later caller becomes a user. Anonymous callers are ignored.\n" #
    "- `_internet_identity_sign_in_start() : async Blob` — update. Starts an Internet Identity sign-in challenge.\n" #
    "- `_internet_identity_sign_in_finish() : async Result<(), Error>` — update. Completes the sign-in and registers the caller.\n" #
    "- `getCallerUserRole() : async UserRole` — query. Returns the caller's role (`#admin`, `#user`, or `#guest` for anonymous).\n" #
    "- `assignCallerUserRole(user : Principal, role : UserRole) : async ()` — update. Assigns a role to a user. Admin only.\n" #
    "- `isCallerAdmin() : async Bool` — query. Whether the caller is an admin.\n" #
    "\n" #
    "The backend also exposes the platform object-storage plumbing (`_immutableObjectStorage*` methods) used to store and serve audio blobs; these are internal and not part of the user-facing API.\n" #
    "\n" #
    "## Authentication and authorization\n" #
    "\n" #
    "Callers are identified by their Internet Computer principal. Roles are `#admin`, `#user`, and `#guest` (anonymous).\n" #
    "\n" #
    "**Registration prerequisite.** A caller becomes registered only by calling `_initialize_access_control` (or `_internet_identity_sign_in_finish`) once as a signed-in (non-anonymous) caller. The first caller to register receives the `#admin` role; every subsequent caller receives `#user`. A caller can be unregistered even when the app already knows them: registration happens only when a caller signs in through the app's own frontend, so a principal that never did so is unregistered even if it belongs to the app's owner, and a signed-in caller derived against a different origin is a different principal than the one the frontend registered.\n" #
    "\n" #
    "**Guarded endpoints.** The following methods require the caller to hold `#user` permission (admin always passes): `uploadPost`, `deletePost`, `likePost`, `unlikePost`, `repostPost`, `unrepostPost`, `recordPlay`, `followUser`, `unfollowUser`, `getFeed` with the `#following` filter, `startConversation`, `sendMessage`, `markConversationRead`, `addComment`, `replyToComment`, `createPlaylist`, `addTrackToPlaylist`, and `getRecommendations`. If the caller is anonymous or unregistered, these trap with `Unauthorized: Only signed-in users can perform this action`. `getCallerUserRole` traps with `User is not registered` for a non-anonymous unregistered caller.\n" #
    "\n" #
    "**Additional boundaries.** `deletePost` also requires the caller to be the post's uploader, else it traps with `Unauthorized: Only the uploader can delete this post`. `followUser` traps with `Cannot follow yourself` when the target equals the caller. `startConversation` traps with `Cannot start a conversation with yourself` when the target equals the caller. `getConversation`, `sendMessage`, and `markConversationRead` require the caller to be one of the two conversation participants, else they trap with `Unauthorized: Only conversation participants can read messages`, `Unauthorized: Only conversation participants can send messages`, or `Unauthorized: Only conversation participants can mark as read` respectively. `addTrackToPlaylist` requires the caller to own the playlist, else it traps with `Unauthorized: Only the playlist owner can add tracks`. `assignCallerUserRole` requires the caller to be an admin, else it traps with `Unauthorized: Only admins can assign user roles`.\n" #
    "\n" #
    "**Read-only endpoints** (`getFeed` with `#forYou`, `getPost`, `getProfile`, `getUserPosts`, `getUserReposts`, `getComments`, `getCommentCount`, `getPlaylists`, `getCallerUserRole`, `isCallerAdmin`) are public and do not require registration. `getConversations` and `getConversation` require a signed-in caller because they expose private per-user data.\n" #
    "\n" #
    "**Identity derivation.** The app's frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available. An agent already holding the user's Internet Identity authorization derives the correct per-app principal against that origin, for example `icp identity link web <name> --app <host>`. Such a delegation acts with the user's full authority in this app until it expires.\n" #
    "\n" #
    "## Units and encodings\n" #
    "\n" #
    "- `PostId` is a `Nat`, auto-incremented from an internal counter at upload time.\n" #
    "- `createdAt` is an `Int` in nanoseconds since the Unix epoch (`Time.now()`).\n" #
    "- `audio` is an `ExternalBlob` (a `Blob`) holding the audio file bytes, stored and served through the platform object-storage service.\n" #
    "- `uploader`, `liker`, `reposter`, `follower`, `followee`, and `principal` are `Principal` values; their text form is the standard principal string.\n" #
    "- `FeedFilter` is a variant: `#following` or `#forYou`.\n" #
    "- `FeedPage` is `{ posts : [PostView]; nextCursor : ?PostId }`.\n" #
    "- `PostView` extends the post record with `likedByCaller : Bool` and `repostedByCaller : Bool`, computed against the calling principal.\n" #
    "- `UserProfile` is `{ principal : Principal; followerCount : Nat; followingCount : Nat; isFollowing : Bool }`.\n" #
    "- `ConversationId`, `MessageId`, `CommentId`, and `PlaylistId` are `Nat`s, auto-incremented from internal counters.\n" #
    "- `Conversation` is a private 1:1 chat between `participantA` and `participantB`; `lastMessage`/`lastMessageAt`/`lastSender` hold the most recent message, and `unreadForA`/`unreadForB` track unread counts per participant.\n" #
    "- `ConversationView` is `{ id; otherUser; lastMessage; lastMessageAt; unreadCount }`, computed against the calling principal.\n" #
    "- `MessageView` is `{ id; sender; text; createdAt }`; messages are returned in chronological order.\n" #
    "- `CommentView` is `{ id; postId; author; text; createdAt; parentId; replyCount }`. A top-level comment has `parentId = null`; a reply has `parentId = ?<parentCommentId>`. Comments are returned newest first.\n" #
    "- `PlaylistView` is `{ id; name; trackIds; createdAt }`, where `trackIds` is a list of `PostId`s.\n" #
    "\n" #
    "## Lifecycle and polling\n" #
    "\n" #
    "Feed pagination is cursor-based. Call `getFeed` with a `limit`; the response's `nextCursor` is the id of the last post in the page. Pass that value as the `cursor` of the next call to fetch the following page. `nextCursor` is `null` when there are no more posts. `getFeed` with `#following` requires a signed-in caller; `#forYou` is public.\n" #
    "\n" #
    "Messaging is pull-based: there is no push delivery. A participant polls `getConversations` to see new conversations and unread counts, and `getConversation` to fetch the message thread. `sendMessage` appends a message and increments the other participant's unread count; the recipient clears it with `markConversationRead`. `getConversation` returns messages in chronological order (oldest first).\n" #
    "\n" #
    "## Mutation retry safety\n" #
    "\n" #
    "- `likePost`, `repostPost`, `followUser`, `unlikePost`, `unrepostPost`, `unfollowUser`, `startConversation`, and `addTrackToPlaylist` are idempotent: repeating the same call is a no-op, so retries are safe.\n" #
    "- `recordPlay` increments the play count by one on every call, so it is not idempotent; retrying a play increments the count again.\n" #
    "- `uploadPost`, `sendMessage`, `addComment`, `replyToComment`, and `createPlaylist` create a new record on every call and are not idempotent; retrying duplicates the record.\n" #
    "- `deletePost` is destructive and traps with `Post not found` if the post does not exist.\n" #
    "\n" #
    "## Errors, traps, and limits\n" #
    "\n" #
    "Failures are raised as traps (rejections), not `Result` errors. The exact messages are: `Unauthorized: Only signed-in users can perform this action`, `Unauthorized: Only the uploader can delete this post`, `Post not found`, `Cannot follow yourself`, `Cannot start a conversation with yourself`, `Conversation not found`, `Unauthorized: Only conversation participants can read messages`, `Unauthorized: Only conversation participants can send messages`, `Unauthorized: Only conversation participants can mark as read`, `Parent comment not found`, `Parent comment does not belong to this post`, `Playlist not found`, `Unauthorized: Only the playlist owner can add tracks`, `User is not registered`, and `Unauthorized: Only admins can assign user roles`. A trap rolls back the whole message, so a rejected call has no partial effect.\n" #
    "\n" #
    "## OQL data access\n" #
    "\n" #
    "The backend exposes its persisted data through the OQL `schema()` and `execute()` query endpoints. Eight entities are registered:\n" #
    "\n" #
    "- `post` — one row per music post (id, title, caption, uploader, audio, filename, createdAt, playCount, likeCount, repostCount). Public (readable by anyone, including anonymous callers).\n" #
    "- `like` — one row per like edge (key, postId, liker). Public.\n" #
    "- `repost` — one row per repost edge (key, postId, reposter). Public.\n" #
    "- `follow` — one row per follow edge (key, follower, followee). Public.\n" #
    "- `conversation` — one row per private 1:1 conversation (id, participantA, participantB, lastMessage, lastMessageAt, lastSender, unreadForA, unreadForB, createdAt). Controller-or-scoped: the platform reads all rows; a signed-in caller reads only conversations they participate in.\n" #
    "- `message` — one row per message (key, id, conversationId, sender, text, createdAt). Controller-or-scoped: the platform reads all rows; a signed-in caller reads only messages in conversations they participate in.\n" #
    "- `comment` — one row per comment (id, postId, author, text, createdAt, parentId, replyCount). Public.\n" #
    "- `playlist` — one row per playlist (id, owner, name, trackCount, createdAt). Controller-or-scoped: the platform reads all rows; a signed-in caller reads only playlists they own.\n" #
    "\n" #
    "## Non-obvious gotchas\n" #
    "\n" #
    "- `getFeed` with `#following` requires a signed-in caller, while `#forYou` is public — an anonymous caller must use `#forYou`.\n" #
    "- `getUserPosts` returns both uploaded and reposted posts, deduplicated; `getUserReposts` returns only reposted posts.\n" #
    "- `audio` is binary blob data; download it through the object-storage URL rather than treating it as text.\n" #
    "- Like/repost counts on a post are kept in sync with the backing sets, so a count reflects the current set size.\n" #
    "- Conversations are strictly 1:1 and private: only the two participants can read or send in a conversation, enforced on the backend. There is no group conversation support and no push delivery; recipients poll for new messages.\n" #
    "- `getComments` returns both top-level comments and replies together, newest first; a reply's `parentId` links it to its parent comment, and the parent's `replyCount` reflects the number of direct replies.\n" #
    "- `getRecommendations` excludes posts the caller uploaded or liked and ranks the rest by engagement plus a bonus for followed uploaders or posts liked by followed users; it does not consider reposts.\n" #
    "- In the OQL `conversation` and `message` entities, a signed-in caller sees only rows from conversations they participate in; the platform controller sees all rows. The `comment` and `playlist` entities expose `parentId`/`trackCount` as flattened scalar columns (a `null` parent becomes `0`, and a playlist's track list is summarized by its count).\n"
  };
};
