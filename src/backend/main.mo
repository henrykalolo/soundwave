import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BlobValue "mo:caffeineai-oql/BlobValue";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Types "types/music";
import MusicApi "mixins/music-api";
import SocialTypes "types/messaging-comments-social";
import SocialApi "mixins/messaging-comments-social-api";
import SocialLib "lib/messaging-comments-social";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();

  let posts : Map.Map<Types.PostId, Types.MusicPost>;
  let state : {
    var nextPostId : Nat;
    var nextConversationId : Nat;
    var nextMessageId : Nat;
    var nextCommentId : Nat;
    var nextPlaylistId : Nat;
  };
  let likes : Map.Map<Types.PostId, Set.Set<Principal>>;
  let reposts : Map.Map<Types.PostId, Set.Set<Principal>>;
  let following : Map.Map<Principal, Set.Set<Principal>>;
  let followers : Map.Map<Principal, Set.Set<Principal>>;

  let conversations : Map.Map<SocialTypes.ConversationId, SocialTypes.Conversation>;
  let messages : Map.Map<SocialTypes.ConversationId, List.List<SocialTypes.Message>>;
  let comments : Map.Map<SocialTypes.CommentId, SocialTypes.Comment>;
  let playlists : Map.Map<SocialTypes.PlaylistId, SocialTypes.Playlist>;

  include MusicApi(accessControlState, posts, state, likes, reposts, following, followers);
  include SocialApi(accessControlState, conversations, messages, comments, playlists, state, posts, likes, following);

  transient let anyP = Principal.fromText("aaaaa-aa");

  // Flatten the like map (postId -> set of likers) into one row per like.
  func flattenLikes() : [(Types.PostId, Principal)] {
    let out = List.empty<(Types.PostId, Principal)>();
    for ((postId, s) in likes.entries()) {
      for (p in s.values()) {
        out.add((postId, p));
      };
    };
    out.toArray();
  };

  // Flatten the repost map (postId -> set of reposters) into one row per repost.
  func flattenReposts() : [(Types.PostId, Principal)] {
    let out = List.empty<(Types.PostId, Principal)>();
    for ((postId, s) in reposts.entries()) {
      for (p in s.values()) {
        out.add((postId, p));
      };
    };
    out.toArray();
  };

  // Flatten the following map (follower -> set of followees) into one row per follow edge.
  func flattenFollowing() : [(Principal, Principal)] {
    let out = List.empty<(Principal, Principal)>();
    for ((follower, s) in following.entries()) {
      for (followee in s.values()) {
        out.add((follower, followee));
      };
    };
    out.toArray();
  };

  // Flatten the messages map (conversationId -> list of messages) into one row per message.
  func flattenMessages() : [(SocialTypes.ConversationId, SocialTypes.Message)] {
    let out = List.empty<(SocialTypes.ConversationId, SocialTypes.Message)>();
    for ((cid, msgs) in messages.entries()) {
      for (m in msgs.values()) {
        out.add((cid, m));
      };
    };
    out.toArray();
  };

  // A caller can see a conversation if they are one of its two participants.
  func canSeeConversation(caller : Principal, owner : OQL.Value) : Bool {
    switch (owner) {
      case (#text(pa)) {
        let paP = Principal.fromText(pa);
        for ((_, conv) in conversations.entries()) {
          if (conv.participantA == paP) {
            return SocialLib.isParticipant(conv, caller);
          };
        };
        false;
      };
      case _ { false };
    };
  };

  // A caller can see a message if they participate in the sender's conversation.
  func canSeeMessage(caller : Principal, owner : OQL.Value) : Bool {
    switch (owner) {
      case (#text(sender)) {
        let sp = Principal.fromText(sender);
        for ((_, conv) in conversations.entries()) {
          if (conv.participantA == sp or conv.participantB == sp) {
            if (SocialLib.isParticipant(conv, caller)) { return true };
          };
        };
        false;
      };
      case _ { false };
    };
  };

  include Expose({
    entities = [
      posts.toEntity("post", "MusicPost", "id")
        .sample({ id = 0; title = ""; caption = ""; uploader = anyP; audio = Array.toBlob([]); filename = ""; createdAt = 0 : Int; playCount = 0; likeCount = 0; repostCount = 0 })
        .public_()
        .build(),
      OQL.Entity.manual<(Types.PostId, Principal)>("like", func () = flattenLikes().values(), "Like", "key")
        .sample((0, anyP))
        .payload("key", func ((postId, p)) = postId.toText() # ":" # p.toText())
        .payload("postId", func ((postId, _)) = postId)
        .payload("liker", func ((_, p)) = p)
        .public_()
        .build(),
      OQL.Entity.manual<(Types.PostId, Principal)>("repost", func () = flattenReposts().values(), "Repost", "key")
        .sample((0, anyP))
        .payload("key", func ((postId, p)) = postId.toText() # ":" # p.toText())
        .payload("postId", func ((postId, _)) = postId)
        .payload("reposter", func ((_, p)) = p)
        .public_()
        .build(),
      OQL.Entity.manual<(Principal, Principal)>("follow", func () = flattenFollowing().values(), "Follow", "key")
        .sample((anyP, anyP))
        .payload("key", func ((follower, followee)) = follower.toText() # ":" # followee.toText())
        .payload("follower", func ((follower, _)) = follower)
        .payload("followee", func ((_, followee)) = followee)
        .public_()
        .build(),
      conversations.toEntityManual("conversation", "Conversation", "id")
        .sample({ id = 0; participantA = anyP; participantB = anyP; lastMessage = null; lastMessageAt = null; lastSender = null; unreadForA = 0; unreadForB = 0; createdAt = 0 })
        .payload("id", func c = c.id)
        .payload("participantA", func c = c.participantA)
        .payload("participantB", func c = c.participantB)
        .payload("lastMessage", func c = c.lastMessage ?? "")
        .payload("lastMessageAt", func c = c.lastMessageAt ?? 0)
        .payload("lastSender", func c = c.lastSender ?? anyP)
        .payload("unreadForA", func c = c.unreadForA)
        .payload("unreadForB", func c = c.unreadForB)
        .payload("createdAt", func c = c.createdAt)
        .ownedByWith("participantA", canSeeConversation)
        .controllerOrScoped()
        .build(),
      OQL.Entity.manual<(SocialTypes.ConversationId, SocialTypes.Message)>("message", func () = flattenMessages().values(), "Message", "key")
        .sample((0, { id = 0; conversationId = 0; sender = anyP; text = ""; createdAt = 0 }))
        .payload("key", func ((cid, m)) = cid.toText() # ":" # m.id.toText())
        .payload("id", func ((_, m)) = m.id)
        .payload("conversationId", func ((cid, _)) = cid)
        .payload("sender", func ((_, m)) = m.sender)
        .payload("text", func ((_, m)) = m.text)
        .payload("createdAt", func ((_, m)) = m.createdAt)
        .ownedByWith("sender", canSeeMessage)
        .controllerOrScoped()
        .build(),
      comments.toEntityManual("comment", "Comment", "id")
        .sample({ id = 0; postId = 0; author = anyP; text = ""; createdAt = 0; parentId = null; replyCount = 0 })
        .payload("id", func c = c.id)
        .payload("postId", func c = c.postId)
        .payload("author", func c = c.author)
        .payload("text", func c = c.text)
        .payload("createdAt", func c = c.createdAt)
        .payload("parentId", func c = c.parentId ?? 0)
        .payload("replyCount", func c = c.replyCount)
        .public_()
        .build(),
      playlists.toEntityManual("playlist", "Playlist", "id")
        .sample({ id = 0; owner = anyP; name = ""; trackIds = []; createdAt = 0 })
        .payload("id", func p = p.id)
        .payload("owner", func p = p.owner)
        .payload("name", func p = p.name)
        .payload("trackCount", func p = p.trackIds.size())
        .payload("createdAt", func p = p.createdAt)
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
    ];
  });

  include ApiDocMixin();
};
