import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    posts : Map.Map<Nat, MusicPost>;
    state : { var nextPostId : Nat };
    likes : Map.Map<Nat, Set.Set<Principal>>;
    reposts : Map.Map<Nat, Set.Set<Principal>>;
    following : Map.Map<Principal, Set.Set<Principal>>;
    followers : Map.Map<Principal, Set.Set<Principal>>;
  };

  type MusicPost = {
    id : Nat;
    title : Text;
    caption : Text;
    uploader : Principal;
    audio : Blob;
    filename : Text;
    createdAt : Int;
    playCount : Nat;
    likeCount : Nat;
    repostCount : Nat;
  };

  type Conversation = {
    id : Nat;
    participantA : Principal;
    participantB : Principal;
    lastMessage : ?Text;
    lastMessageAt : ?Int;
    lastSender : ?Principal;
    unreadForA : Nat;
    unreadForB : Nat;
    createdAt : Int;
  };

  type Message = {
    id : Nat;
    conversationId : Nat;
    sender : Principal;
    text : Text;
    createdAt : Int;
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    text : Text;
    createdAt : Int;
    parentId : ?Nat;
    replyCount : Nat;
  };

  type Playlist = {
    id : Nat;
    owner : Principal;
    name : Text;
    trackIds : [Nat];
    createdAt : Int;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    posts : Map.Map<Nat, MusicPost>;
    state : {
      var nextPostId : Nat;
      var nextConversationId : Nat;
      var nextMessageId : Nat;
      var nextCommentId : Nat;
      var nextPlaylistId : Nat;
    };
    likes : Map.Map<Nat, Set.Set<Principal>>;
    reposts : Map.Map<Nat, Set.Set<Principal>>;
    following : Map.Map<Principal, Set.Set<Principal>>;
    followers : Map.Map<Principal, Set.Set<Principal>>;
    conversations : Map.Map<Nat, Conversation>;
    messages : Map.Map<Nat, List.List<Message>>;
    comments : Map.Map<Nat, Comment>;
    playlists : Map.Map<Nat, Playlist>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      posts = old.posts;
      state = {
        var nextPostId = old.state.nextPostId;
        var nextConversationId = 0;
        var nextMessageId = 0;
        var nextCommentId = 0;
        var nextPlaylistId = 0;
      };
      likes = old.likes;
      reposts = old.reposts;
      following = old.following;
      followers = old.followers;
      conversations = Map.empty();
      messages = Map.empty();
      comments = Map.empty();
      playlists = Map.empty();
    };
  };
};
