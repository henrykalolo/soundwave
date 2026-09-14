import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef } from "react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    next,
    prev,
    setCurrentTime,
    setDuration,
  } = useAudioPlayer();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.audio.getDirectURL();
    audio.currentTime = 0;
    void audio.play();
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (isPlaying) void audio.play();
    else audio.pause();
  }, [isPlaying, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => next();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [setCurrentTime, setDuration, next]);

  if (!currentTrack) return null;

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = value[0];
    seek(value[0]);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/80 shadow-player backdrop-blur-xl">
      <audio ref={audioRef}>
        <track kind="captions" />
      </audio>
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-11 shrink-0 rounded-lg">
            <AvatarFallback className="bg-primary/20 font-display text-primary">
              {currentTrack.title.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {currentTrack.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={prev}
            aria-label="Previous track"
            data-ocid="player.prev_button"
          >
            <SkipBack className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            data-ocid="player.play_button"
          >
            {isPlaying ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label="Next track"
            data-ocid="player.next_button"
          >
            <SkipForward className="size-5" />
          </Button>
        </div>

        <div className="hidden flex-1 items-center gap-2 sm:flex">
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
            aria-label="Seek"
          />
          <span className="w-10 text-xs tabular-nums text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            data-ocid="player.mute_button"
          >
            {volume === 0 ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => setVolume(v[0])}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
