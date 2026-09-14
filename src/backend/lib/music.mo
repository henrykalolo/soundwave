import Storage "mo:caffeineai-object-storage/Storage";
import Types "../types/music";

module {
  public func createPost(
    id : Types.PostId,
    title : Text,
    caption : Text,
    uploader : Principal,
    audio : Storage.ExternalBlob,
    filename : Text,
    createdAt : Int,
  ) : Types.MusicPost {
    {
      id;
      title;
      caption;
      uploader;
      audio;
      filename;
      createdAt;
      playCount = 0;
      likeCount = 0;
      repostCount = 0;
    };
  };

  public func toView(post : Types.MusicPost) : Types.PostView {
    {
      id = post.id;
      title = post.title;
      caption = post.caption;
      uploader = post.uploader;
      audio = post.audio;
      filename = post.filename;
      createdAt = post.createdAt;
      playCount = post.playCount;
      likeCount = post.likeCount;
      repostCount = post.repostCount;
      likedByCaller = false;
      repostedByCaller = false;
    };
  };

  // Engagement weighting: likes and reposts boost visibility, plays add a small signal.
  public func engagementScore(post : Types.MusicPost) : Int {
    post.likeCount.toInt() * 2 + post.repostCount.toInt() * 3 + post.playCount.toInt();
  };

  // Order posts by engagement (desc), then recency (desc) as a tiebreaker.
  public func orderByEngagement(posts : [Types.MusicPost]) : [Types.MusicPost] {
    posts.sort(func (a, b) {
      let sa = engagementScore(a);
      let sb = engagementScore(b);
      if (sa > sb) { #less }
      else if (sa < sb) { #greater }
      else if (a.createdAt > b.createdAt) { #less }
      else if (a.createdAt < b.createdAt) { #greater }
      else { #equal };
    });
  };
};
