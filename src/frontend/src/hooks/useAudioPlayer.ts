import type { MusicPost } from "@/types";
import { create } from "zustand";

interface AudioPlayerState {
  currentTrack: MusicPost | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: MusicPost[];
  queueIndex: number;
  playTrack: (track: MusicPost, queue?: MusicPost[]) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  next: () => void;
  prev: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const useAudioPlayer = create<AudioPlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  queueIndex: -1,
  playTrack: (track, queue) => {
    const q = queue ?? [track];
    const idx = q.findIndex((t) => t.id === track.id);
    set({
      currentTrack: track,
      queue: q,
      queueIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      currentTime: 0,
    });
  },
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  pause: () => set({ isPlaying: false }),
  seek: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  next: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    set({
      queueIndex: nextIndex,
      currentTrack: queue[nextIndex],
      currentTime: 0,
      isPlaying: true,
    });
  },
  prev: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    set({
      queueIndex: prevIndex,
      currentTrack: queue[prevIndex],
      currentTime: 0,
      isPlaying: true,
    });
  },
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
}));
