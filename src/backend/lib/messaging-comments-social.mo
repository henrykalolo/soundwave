import Int "mo:core/Int";
import Types "../types/messaging-comments-social";
import MusicTypes "../types/music";

module {
  public func newConversation(
    id : Types.ConversationId,
    participantA : Principal,
    participantB : Principal,
    createdAt : Int,
  ) : Types.Conversation {
    {
      id;
      participantA;
      participantB;
      lastMessage = null;
      lastMessageAt = null;
      lastSender = null;
      unreadForA = 0;
      unreadForB = 0;
      createdAt;
    };
  };

  public func newMessage(
    id : Types.MessageId,
    conversationId : Types.ConversationId,
    sender : Principal,
    text : Text,
    createdAt : Int,
  ) : Types.Message {
    { id; conversationId; sender; text; createdAt };
  };

  public func newComment(
    id : Types.CommentId,
    postId : MusicTypes.PostId,
    author : Principal,
    text : Text,
    createdAt : Int,
    parentId : ?Types.CommentId,
  ) : Types.Comment {
    { id; postId; author; text; createdAt; parentId; replyCount = 0 };
  };

  public func newPlaylist(
    id : Types.PlaylistId,
    owner : Principal,
    name : Text,
    createdAt : Int,
  ) : Types.Playlist {
    { id; owner; name; trackIds = []; createdAt };
  };

  public func otherParticipant(conversation : Types.Conversation, caller : Principal) : Principal {
    if (conversation.participantA == caller) {
      conversation.participantB;
    } else {
      conversation.participantA;
    };
  };

  public func isParticipant(conversation : Types.Conversation, caller : Principal) : Bool {
    conversation.participantA == caller or conversation.participantB == caller;
  };

  public func toConversationView(conversation : Types.Conversation, caller : Principal) : Types.ConversationView {
    let other = otherParticipant(conversation, caller);
    let unread = if (conversation.participantA == caller) {
      conversation.unreadForA;
    } else {
      conversation.unreadForB;
    };
    {
      id = conversation.id;
      otherUser = other;
      lastMessage = conversation.lastMessage;
      lastMessageAt = conversation.lastMessageAt;
      unreadCount = unread;
    };
  };

  public func toMessageView(message : Types.Message) : Types.MessageView {
    {
      id = message.id;
      sender = message.sender;
      text = message.text;
      createdAt = message.createdAt;
    };
  };

  public func toCommentView(comment : Types.Comment) : Types.CommentView {
    {
      id = comment.id;
      postId = comment.postId;
      author = comment.author;
      text = comment.text;
      createdAt = comment.createdAt;
      parentId = comment.parentId;
      replyCount = comment.replyCount;
    };
  };

  public func toPlaylistView(playlist : Types.Playlist) : Types.PlaylistView {
    {
      id = playlist.id;
      name = playlist.name;
      trackIds = playlist.trackIds;
      createdAt = playlist.createdAt;
    };
  };

  public func orderCommentsNewestFirst(comments : [Types.Comment]) : [Types.Comment] {
    comments.sort(func (a, b) = Int.compare(b.createdAt, a.createdAt));
  };
};
