import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Storage "mo:caffeineai-object-storage/Storage";
import AccessControl "mo:caffeineai-authorization/access-control";
import MusicLib "../lib/music";
import Types "../types/music";

mixin (
  accessControlState : AccessControl.AccessControlState,
  posts : Map.Map<Types.PostId, Types.MusicPost>,
  state : { var nextPostId : Nat },
  likes : Map.Map<Types.PostId, Set.Set<Principal>>,
  reposts : Map.Map<Types.PostId, Set.Set<Principal>>,
  following : Map.Map<Principal, Set.Set<Principal>>,
  followers : Map.Map<Principal, Set.Set<Principal>>,
) {
  func requireUser(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can perform this action");
    };
  };

  func toView(post : Types.MusicPost, caller : Principal) : Types.PostView {
    let liked = switch (likes.get(post.id)) {
      case (?s) s.contains(caller);
      case null false;
    };
    let reposted = switch (reposts.get(post.id)) {
      case (?s) s.contains(caller);
      case null false;
    };
    {
      MusicLib.toView(post) with
      likedByCaller = liked;
      repostedByCaller = reposted;
    };
  };

  public shared ({ caller }) func uploadPost(
    title : Text,
    caption : Text,
    audio : Storage.ExternalBlob,
    filename : Text,
  ) : async Types.PostId {
    requireUser(caller);
    let id = state.nextPostId;
    state.nextPostId += 1;
    let post = MusicLib.createPost(id, title, caption, caller, audio, filename, Time.now());
    posts.add(id, post);
    id;
  };

  public shared ({ caller }) func deletePost(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        if (post.uploader != caller) {
          Runtime.trap("Unauthorized: Only the uploader can delete this post");
        };
        posts.remove(postId);
        likes.remove(postId);
        reposts.remove(postId);
      };
      case null {
        Runtime.trap("Post not found");
      };
    };
  };

  public query ({ caller }) func getFeed(
    filter : Types.FeedFilter,
    cursor : ?Types.PostId,
    limit : Nat,
  ) : async Types.FeedPage {
    let all = posts.values().toArray();
    let ordered = switch (filter) {
      case (#forYou) {
        MusicLib.orderByEngagement(all);
      };
      case (#following) {
        requireUser(caller);
        let followingSet = following.get(caller) ?? Set.empty<Principal>();
        let mine = all.filter(func p = followingSet.contains(p.uploader));
        mine.sort(func (a, b) = Int.compare(b.createdAt, a.createdAt));
      };
    };
    let startIndex = switch (cursor) {
      case (?c) {
        switch (ordered.findIndex(func p = p.id == c)) {
          case (?i) i + 1;
          case null 0;
        };
      };
      case null 0;
    };
    let page = ordered.sliceToArray(startIndex.toInt(), (startIndex + limit).toInt());
    let hasMore = startIndex + limit < ordered.size();
    let nextCursor = if (hasMore and page.size() > 0) {
      ?page.reverse()[0].id;
    } else {
      null;
    };
    {
      posts = page.map(func p = toView(p, caller));
      nextCursor;
    };
  };

  public query ({ caller }) func getPost(postId : Types.PostId) : async ?Types.PostView {
    switch (posts.get(postId)) {
      case (?post) ?toView(post, caller);
      case null null;
    };
  };

  public shared ({ caller }) func likePost(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        let s = likes.get(postId) ?? Set.empty<Principal>();
        if (not s.contains(caller)) {
          s.add(caller);
          likes.add(postId, s);
          let updated = { post with likeCount = s.size() };
          posts.add(postId, updated);
        };
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        switch (likes.get(postId)) {
          case (?s) {
            if (s.contains(caller)) {
              s.remove(caller);
              likes.add(postId, s);
              let updated = { post with likeCount = s.size() };
              posts.add(postId, updated);
            };
          };
          case null {};
        };
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public shared ({ caller }) func repostPost(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        let s = reposts.get(postId) ?? Set.empty<Principal>();
        if (not s.contains(caller)) {
          s.add(caller);
          reposts.add(postId, s);
          let updated = { post with repostCount = s.size() };
          posts.add(postId, updated);
        };
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public shared ({ caller }) func unrepostPost(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        switch (reposts.get(postId)) {
          case (?s) {
            if (s.contains(caller)) {
              s.remove(caller);
              reposts.add(postId, s);
              let updated = { post with repostCount = s.size() };
              posts.add(postId, updated);
            };
          };
          case null {};
        };
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public shared ({ caller }) func recordPlay(postId : Types.PostId) : async () {
    requireUser(caller);
    switch (posts.get(postId)) {
      case (?post) {
        let updated = { post with playCount = post.playCount + 1 };
        posts.add(postId, updated);
      };
      case null { Runtime.trap("Post not found") };
    };
  };

  public shared ({ caller }) func followUser(target : Principal) : async () {
    requireUser(caller);
    if (caller == target) {
      Runtime.trap("Cannot follow yourself");
    };
    let myFollowing = following.get(caller) ?? Set.empty<Principal>();
    if (not myFollowing.contains(target)) {
      myFollowing.add(target);
      following.add(caller, myFollowing);
      let targetFollowers = followers.get(target) ?? Set.empty<Principal>();
      targetFollowers.add(caller);
      followers.add(target, targetFollowers);
    };
  };

  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    requireUser(caller);
    switch (following.get(caller)) {
      case (?myFollowing) {
        if (myFollowing.contains(target)) {
          myFollowing.remove(target);
          following.add(caller, myFollowing);
          switch (followers.get(target)) {
            case (?tf) {
              tf.remove(caller);
              followers.add(target, tf);
            };
            case null {};
          };
        };
      };
      case null {};
    };
  };

  public query ({ caller }) func getProfile(principal : Principal) : async Types.UserProfile {
    let followerCount = switch (followers.get(principal)) {
      case (?s) s.size();
      case null 0;
    };
    let followingCount = switch (following.get(principal)) {
      case (?s) s.size();
      case null 0;
    };
    let isFollowing = switch (following.get(caller)) {
      case (?s) s.contains(principal);
      case null false;
    };
    {
      principal;
      followerCount;
      followingCount;
      isFollowing;
    };
  };

  public query ({ caller }) func getUserPosts(principal : Principal) : async [Types.PostView] {
    let all = posts.values().toArray();
    let uploaded = all.filter(func p = p.uploader == principal);
    let reposted = all.filter(func p = switch (reposts.get(p.id)) {
      case (?s) s.contains(principal);
      case null false;
    });
    let combined = uploaded.concat(reposted);
    let seen = Set.empty<Types.PostId>();
    let builder = List.empty<Types.MusicPost>();
    for (p in combined.values()) {
      if (not seen.contains(p.id)) {
        seen.add(p.id);
        builder.add(p);
      };
    };
    let sorted = builder.toArray().sort(func (a, b) = Int.compare(b.createdAt, a.createdAt));
    sorted.map(func p = toView(p, caller));
  };

  public query ({ caller }) func getUserReposts(principal : Principal) : async [Types.PostView] {
    let all = posts.values().toArray();
    let reposted = all.filter(func p = switch (reposts.get(p.id)) {
      case (?s) s.contains(principal);
      case null false;
    });
    let sorted = reposted.sort(func (a, b) = Int.compare(b.createdAt, a.createdAt));
    sorted.map(func p = toView(p, caller));
  };
};
