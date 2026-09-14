import Storage "mo:caffeineai-object-storage/Storage";

module {
  public type PostId = Nat;

  public type MusicPost = {
    id : PostId;
    title : Text;
    caption : Text;
    uploader : Principal;
    audio : Storage.ExternalBlob;
    filename : Text;
    createdAt : Int;
    playCount : Nat;
    likeCount : Nat;
    repostCount : Nat;
  };

  public type PostView = {
    id : PostId;
    title : Text;
    caption : Text;
    uploader : Principal;
    audio : Storage.ExternalBlob;
    filename : Text;
    createdAt : Int;
    playCount : Nat;
    likeCount : Nat;
    repostCount : Nat;
    likedByCaller : Bool;
    repostedByCaller : Bool;
  };

  public type FeedFilter = {
    #following;
    #forYou;
  };

  public type FeedPage = {
    posts : [PostView];
    nextCursor : ?PostId;
  };

  public type UserProfile = {
    principal : Principal;
    followerCount : Nat;
    followingCount : Nat;
    isFollowing : Bool;
  };
};
