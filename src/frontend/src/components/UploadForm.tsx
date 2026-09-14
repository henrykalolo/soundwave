import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@caffeineai/core-infrastructure";
import { ExternalBlob } from "@caffeineai/object-storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  Music2,
  Pause,
  Play,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "uploading" | "success" | "error";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async (args: {
      title: string;
      caption: string;
      file: File;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      const bytes = new Uint8Array(await args.file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(
        bytes,
        args.file.type,
        args.file.name,
      ).withUploadProgress((pct) => setProgress(pct));
      return actor.uploadPost(args.title, args.caption, blob, args.file.name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    audio.src = previewUrl;
    audio.currentTime = 0;
    setIsPreviewPlaying(false);
    const onPlay = () => setIsPreviewPlaying(true);
    const onPause = () => setIsPreviewPlaying(false);
    const onEnded = () => setIsPreviewPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && !selected.type.startsWith("audio/")) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      setIsPreviewPlaying(false);
      setPhase("error");
      setError(
        "That file isn't audio. Please choose an audio file (MP3, WAV, M4A, etc.).",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setIsPreviewPlaying(false);
    setPhase("idle");
    setError(null);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsPreviewPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || mutation.isPending) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);
    mutation.mutate(
      { title: title.trim(), caption: caption.trim(), file },
      {
        onSuccess: () => {
          setPhase("success");
          setTitle("");
          setCaption("");
          clearFile();
        },
        onError: (err) => {
          setPhase("error");
          setError(
            err instanceof Error
              ? err.message
              : "Upload failed. Please try again.",
          );
        },
      },
    );
  };

  const canPublish = !!file && title.trim().length > 0 && !mutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-ocid="upload.form">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <UploadCloud className="size-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Upload a track</h1>
          <p className="text-sm text-muted-foreground">
            Share your music with the SoundWave community
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-subtle">
        {!file ? (
          <label
            htmlFor="audio-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-card"
            data-ocid="upload.dropzone"
          >
            <input
              id="audio-file"
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UploadCloud className="size-7" />
            </div>
            <div>
              <p className="font-display text-base font-semibold">
                Drop your track here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse — MP3, WAV, M4A and more
              </p>
            </div>
          </label>
        ) : (
          <div
            className="rounded-2xl border border-border bg-background/40 p-4"
            data-ocid="upload.preview"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Music2 className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} · {file.type || "audio"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={togglePreview}
                aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
                data-ocid="upload.preview_play_button"
              >
                {isPreviewPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                aria-label="Remove file"
                data-ocid="upload.remove_file_button"
              >
                <X className="size-5" />
              </Button>
            </div>
            <audio ref={audioRef} className="hidden">
              <track kind="captions" />
            </audio>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Track title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midnight Drive"
            maxLength={120}
            data-ocid="upload.title_input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell listeners about this track…"
            rows={3}
            maxLength={280}
            data-ocid="upload.caption_input"
          />
        </div>

        {phase === "uploading" && (
          <div className="space-y-2" data-ocid="upload.loading_state">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Uploading…
              </span>
              <span className="font-mono tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {phase === "error" && error && (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            data-ocid="upload.error_state"
          >
            {error}
          </div>
        )}

        {phase === "success" && (
          <div
            className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm"
            data-ocid="upload.success_state"
          >
            <div className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="size-5" />
              Your track is live!
            </div>
            <p className="mt-1 text-muted-foreground">
              It's now in the SoundWave feed.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
            data-ocid="upload.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canPublish}
            data-ocid="upload.submit_button"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Publishing…
              </>
            ) : (
              "Publish track"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
