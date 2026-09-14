import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { MusicPost } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";

function makeTrack(id: string, title: string): MusicPost {
  return {
    id,
    title,
    artist: "artist",
    caption: "caption",
    uploader: {
      principal: "aaaaa-aa",
      name: "uploader",
      handle: "uploader",
      bio: "",
      avatar: null,
      followerCount: 0n,
      followingCount: 0n,
    },
    audio: { getDirectURL: () => `https://example.com/${id}.mp3` } as never,
    artwork: null,
    playCount: 0n,
    likeCount: 0n,
    repostCount: 0n,
    createdAt: 0n,
    likedByMe: false,
    repostedByMe: false,
  };
}

describe("useAudioPlayer", () => {
  beforeEach(() => {
    useAudioPlayer.setState({
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      queue: [],
      queueIndex: -1,
    });
  });

  it("plays a track and sets it as current with a queue", () => {
    const track = makeTrack("1", "First");
    useAudioPlayer.getState().playTrack(track);
    const state = useAudioPlayer.getState();
    expect(state.currentTrack?.id).toBe("1");
    expect(state.isPlaying).toBe(true);
    expect(state.queue).toHaveLength(1);
    expect(state.queueIndex).toBe(0);
  });

  it("toggles play state", () => {
    const track = makeTrack("1", "First");
    useAudioPlayer.getState().playTrack(track);
    expect(useAudioPlayer.getState().isPlaying).toBe(true);
    useAudioPlayer.getState().togglePlay();
    expect(useAudioPlayer.getState().isPlaying).toBe(false);
    useAudioPlayer.getState().togglePlay();
    expect(useAudioPlayer.getState().isPlaying).toBe(true);
  });

  it("advances through the queue with next and prev", () => {
    const a = makeTrack("1", "A");
    const b = makeTrack("2", "B");
    const c = makeTrack("3", "C");
    useAudioPlayer.getState().playTrack(a, [a, b, c]);
    useAudioPlayer.getState().next();
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("2");
    useAudioPlayer.getState().next();
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("3");
    // Wraps around.
    useAudioPlayer.getState().next();
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("1");
    useAudioPlayer.getState().prev();
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("3");
  });

  it("sets volume and seeks", () => {
    useAudioPlayer.getState().setVolume(0.5);
    expect(useAudioPlayer.getState().volume).toBe(0.5);
    useAudioPlayer.getState().seek(42);
    expect(useAudioPlayer.getState().currentTime).toBe(42);
  });
});
