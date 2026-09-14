import Types "../types/music";

module {
  public type ConversationId = Nat;
  public type MessageId = Nat;
  public type CommentId = Nat;
  public type PlaylistId = Nat;

  public type Conversation = {
    id : ConversationId;
    participantA : Principal;
    participantB : Principal;
    lastMessage : ?Text;
    lastMessageAt : ?Int;
    lastSender : ?Principal;
    unreadForA : Nat;
    unreadForB : Nat;
    createdAt : Int;
  };

  public type Message = {
    id : MessageId;
    conversationId : ConversationId;
    sender : Principal;
    text : Text;
    createdAt : Int;
  };

  public type ConversationView = {
    id : ConversationId;
    otherUser : Principal;
    lastMessage : ?Text;
    lastMessageAt : ?Int;
    unreadCount : Nat;
  };

  public type MessageView = {
    id : MessageId;
    sender : Principal;
    text : Text;
    createdAt : Int;
  };

  public type Comment = {
    id : CommentId;
    postId : Types.PostId;
    author : Principal;
    text : Text;
    createdAt : Int;
    parentId : ?CommentId;
    replyCount : Nat;
  };

  public type CommentView = {
    id : CommentId;
    postId : Types.PostId;
    author : Principal;
    text : Text;
    createdAt : Int;
    parentId : ?CommentId;
    replyCount : Nat;
  };

  public type Playlist = {
    id : PlaylistId;
    owner : Principal;
    name : Text;
    trackIds : [Types.PostId];
    createdAt : Int;
  };

  public type PlaylistView = {
    id : PlaylistId;
    name : Text;
    trackIds : [Types.PostId];
    createdAt : Int;
  };
};
