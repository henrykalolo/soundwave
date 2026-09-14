import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import MusicLib "../lib/music";
import MusicTypes "../types/music";
import SocialLib "../lib/messaging-comments-social";
import Types "../types/messaging-comments-social";

mixin (
  accessControlState : AccessControl.AccessControlState,
  conversations : Map.Map<Types.ConversationId, Types.Conversation>,
  messages : Map.Map<Types.ConversationId, List.List<Types.Message>>,
  comments : Map.Map<Types.CommentId, Types.Comment>,
  playlists : Map.Map<Types.PlaylistId, Types.Playlist>,
  state : {
    var nextConversationId : Nat;
    var nextMessageId : Nat;
    var nextCommentId : Nat;
    var nextPlaylistId : Nat;
  },
  posts : Map.Map<MusicTypes.PostId, MusicTypes.MusicPost>,
  likes : Map.Map<MusicTypes.PostId, Set.Set<Principal>>,
  following : Map.Map<Principal, Set.Set<Principal>>,
) {
  func requireSocialUser(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can perform this action");
    };
  };

  func toSocialView(post : MusicTypes.MusicPost, caller : Principal) : MusicTypes.PostView {
    let liked = switch (likes.get(post.id)) {
      case (?s) s.contains(caller);
      case null false;
    };
    {
      MusicLib.toView(post) with
      likedByCaller = liked;
      repostedByCaller = false;
    };
  };

  // Score a candidate post for recommendations: engagement plus a bonus when
  // the uploader is followed or a followed user liked it.
  func recommendationScore(
    post : MusicTypes.MusicPost,
    myFollowing : Set.Set<Principal>,
  ) : Int {
    var score = MusicLib.engagementScore(post);
    if (myFollowing.contains(post.uploader)) {
      score += 3;
    };
    switch (likes.get(post.id)) {
      case (?s) {
        for (liker in s.values()) {
          if (myFollowing.contains(liker)) {
            score += 2;
          };
        };
      };
      case null {};
    };
    score;
  };

  public shared ({ caller }) func startConversation(other : Principal) : async Types.ConversationId {
    requireSocialUser(caller);
    if (caller == other) {
      Runtime.trap("Cannot start a conversation with yourself");
    };
    for ((id, conv) in conversations.entries()) {
      if ((conv.participantA == caller and conv.participantB == other) or
          (conv.participantA == other and conv.participantB == caller)) {
        return id;
      };
    };
    let id = state.nextConversationId;
    state.nextConversationId += 1;
    let conv = SocialLib.newConversation(id, caller, other, Time.now());
    conversations.add(id, conv);
    id;
  };

  public query ({ caller }) func getConversations() : async [Types.ConversationView] {
    requireSocialUser(caller);
    let mine = List.empty<Types.ConversationView>();
    for ((_, conv) in conversations.entries()) {
      if (SocialLib.isParticipant(conv, caller)) {
        mine.add(SocialLib.toConversationView(conv, caller));
      };
    };
    mine.toArray();
  };

  public query ({ caller }) func getConversation(conversationId : Types.ConversationId) : async ?[Types.MessageView] {
    requireSocialUser(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        if (not SocialLib.isParticipant(conv, caller)) {
          Runtime.trap("Unauthorized: Only conversation participants can read messages");
        };
        let msgs = messages.get(conversationId) ?? List.empty<Types.Message>();
        ?msgs.toArray().map(func m = SocialLib.toMessageView(m));
      };
      case null null;
    };
  };

  public shared ({ caller }) func sendMessage(conversationId : Types.ConversationId, text : Text) : async Types.MessageId {
    requireSocialUser(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        if (not SocialLib.isParticipant(conv, caller)) {
          Runtime.trap("Unauthorized: Only conversation participants can send messages");
        };
        let id = state.nextMessageId;
        state.nextMessageId += 1;
        let msg = SocialLib.newMessage(id, conversationId, caller, text, Time.now());
        let list = messages.get(conversationId) ?? List.empty<Types.Message>();
        list.add(msg);
        messages.add(conversationId, list);
        let updated = if (conv.participantA == caller) {
          {
            conv with
            lastMessage = ?text;
            lastMessageAt = ?Time.now();
            lastSender = ?caller;
            unreadForB = conv.unreadForB + 1;
          };
        } else {
          {
            conv with
            lastMessage = ?text;
            lastMessageAt = ?Time.now();
            lastSender = ?caller;
            unreadForA = conv.unreadForA + 1;
          };
        };
        conversations.add(conversationId, updated);
        id;
      };
      case null { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func markConversationRead(conversationId : Types.ConversationId) : async () {
    requireSocialUser(caller);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        if (not SocialLib.isParticipant(conv, caller)) {
          Runtime.trap("Unauthorized: Only conversation participants can mark as read");
        };
        let updated = if (conv.participantA == caller) {
          { conv with unreadForA = 0 };
        } else {
          { conv with unreadForB = 0 };
        };
        conversations.add(conversationId, updated);
      };
      case null { Runtime.trap("Conversation not found") };
    };
  };

  public shared ({ caller }) func addComment(postId : MusicTypes.PostId, text : Text) : async Types.CommentId {
    requireSocialUser(caller);
    switch (posts.get(postId)) {
      case null { Runtime.trap("Post not found") };
      case (?_) {};
    };
    let id = state.nextCommentId;
    state.nextCommentId += 1;
    let comment = SocialLib.newComment(id, postId, caller, text, Time.now(), null);
    comments.add(id, comment);
    id;
  };

  public shared ({ caller }) func replyToComment(postId : MusicTypes.PostId, parentId : Types.CommentId, text : Text) : async Types.CommentId {
    requireSocialUser(caller);
    switch (posts.get(postId)) {
      case null { Runtime.trap("Post not found") };
      case (?_) {};
    };
    switch (comments.get(parentId)) {
      case (?parent) {
        if (parent.postId != postId) {
          Runtime.trap("Parent comment does not belong to this post");
        };
        let id = state.nextCommentId;
        state.nextCommentId += 1;
        let comment = SocialLib.newComment(id, postId, caller, text, Time.now(), ?parentId);
        comments.add(id, comment);
        let updatedParent = { parent with replyCount = parent.replyCount + 1 };
        comments.add(parentId, updatedParent);
        id;
      };
      case null { Runtime.trap("Parent comment not found") };
    };
  };

  public query func getComments(postId : MusicTypes.PostId) : async [Types.CommentView] {
    let all = comments.values().toArray();
    let forPost = all.filter(func c = c.postId == postId);
    let ordered = SocialLib.orderCommentsNewestFirst(forPost);
    ordered.map(func c = SocialLib.toCommentView(c));
  };

  public query func getCommentCount(postId : MusicTypes.PostId) : async Nat {
    var count = 0;
    for ((_, c) in comments.entries()) {
      if (c.postId == postId) { count += 1 };
    };
    count;
  };

  public shared ({ caller }) func createPlaylist(name : Text) : async Types.PlaylistId {
    requireSocialUser(caller);
    let id = state.nextPlaylistId;
    state.nextPlaylistId += 1;
    let playlist = SocialLib.newPlaylist(id, caller, name, Time.now());
    playlists.add(id, playlist);
    id;
  };

  public shared ({ caller }) func addTrackToPlaylist(playlistId : Types.PlaylistId, postId : MusicTypes.PostId) : async () {
    requireSocialUser(caller);
    switch (playlists.get(playlistId)) {
      case (?playlist) {
        if (playlist.owner != caller) {
          Runtime.trap("Unauthorized: Only the playlist owner can add tracks");
        };
        switch (posts.get(postId)) {
          case null { Runtime.trap("Post not found") };
          case (?_) {};
        };
        if (not playlist.trackIds.contains(postId)) {
          let updated = { playlist with trackIds = playlist.trackIds.concat([postId]) };
          playlists.add(playlistId, updated);
        };
      };
      case null { Runtime.trap("Playlist not found") };
    };
  };

  public query func getPlaylists(principal : Principal) : async [Types.PlaylistView] {
    let mine = List.empty<Types.PlaylistView>();
    for ((_, p) in playlists.entries()) {
      if (p.owner == principal) {
        mine.add(SocialLib.toPlaylistView(p));
      };
    };
    mine.toArray();
  };

  public query ({ caller }) func getRecommendations(limit : Nat) : async [MusicTypes.PostView] {
    requireSocialUser(caller);
    let all = posts.values().toArray();
    let myLikes = Set.empty<MusicTypes.PostId>();
    for ((postId, likers) in likes.entries()) {
      if (likers.contains(caller)) {
        myLikes.add(postId);
      };
    };
    let myFollowing = following.get(caller) ?? Set.empty<Principal>();
    let candidates = all.filter(func p = p.uploader != caller and not myLikes.contains(p.id));
    let scored = candidates.map(func p = {
      post = p;
      score = recommendationScore(p, myFollowing);
    });
    let sorted = scored.sort(func (a, b) = Int.compare(b.score, a.score));
    let top = sorted.sliceToArray(0, limit.toInt());
    top.map(func s = toSocialView(s.post, caller));
  };
};
