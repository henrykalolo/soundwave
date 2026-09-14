import UploadForm from "@/components/UploadForm";
import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { UploadCloud } from "lucide-react";

export default function Upload() {
  const { isAuthenticated, login, isInitializing, isLoggingIn } =
    useInternetIdentity();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-ocid="upload.page">
      {isAuthenticated ? (
        <UploadForm />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
          data-ocid="upload.signin_prompt"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <UploadCloud className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Sign in to upload</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            You need an account to share your music on SoundWave. Sign in to
            start uploading tracks.
          </p>
          <Button
            type="button"
            onClick={() => login()}
            disabled={isInitializing || isLoggingIn}
            data-ocid="upload.signin_button"
          >
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      )}
    </div>
  );
}
