import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  type OldActor = {};

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

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    posts : Map.Map<Nat, MusicPost>;
    state : { var nextPostId : Nat };
    likes : Map.Map<Nat, Set.Set<Principal>>;
    reposts : Map.Map<Nat, Set.Set<Principal>>;
    following : Map.Map<Principal, Set.Set<Principal>>;
    followers : Map.Map<Principal, Set.Set<Principal>>;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      posts = Map.empty();
      state = { var nextPostId = 0 };
      likes = Map.empty();
      reposts = Map.empty();
      following = Map.empty();
      followers = Map.empty();
    };
  };
};
