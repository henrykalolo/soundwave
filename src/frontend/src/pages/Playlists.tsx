import PlaylistCard from "@/components/PlaylistCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatePlaylist, usePlaylists } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ListMusic, Plus } from "lucide-react";
import { useState } from "react";

export default function Playlists() {
  const { isAuthenticated, identity, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const principal = identity?.getPrincipal() ?? null;
  const [name, setName] = useState("");
  const createPlaylist = useCreatePlaylist();
  const {
    data: playlists,
    isLoading,
    isError,
    refetch,
  } = usePlaylists(principal);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value || createPlaylist.isPending) return;
    setName("");
    createPlaylist.mutate(value, {
      onError: () => setName((c) => (c === "" ? value : c)),
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8" data-ocid="playlists.page">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
          data-ocid="playlists.signin_prompt"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <ListMusic className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">
            Sign in to view playlists
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create and manage your playlists on SoundWave.
          </p>
          <Button
            type="button"
            onClick={() => login()}
            disabled={isInitializing || isLoggingIn}
            data-ocid="playlists.signin_button"
          >
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" data-ocid="playlists.page">
      <h1 className="mb-4 font-display text-2xl font-bold">Playlists</h1>

      <form
        onSubmit={handleCreate}
        className="mb-6 flex items-center gap-2"
        data-ocid="playlists.create_form"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          maxLength={80}
          data-ocid="playlists.name_input"
        />
        <Button
          type="submit"
          disabled={!name.trim() || createPlaylist.isPending}
          data-ocid="playlists.create_button"
        >
          <Plus className="size-4" />
          Create
        </Button>
      </form>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
            <Skeleton key={id} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border border-border/60 bg-card p-8 text-center"
          data-ocid="playlists.error_state"
        >
          <p className="font-display text-lg font-semibold">
            Couldn&apos;t load playlists
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => refetch()}
            data-ocid="playlists.retry_button"
          >
            Retry
          </Button>
        </div>
      ) : !playlists || playlists.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
          data-ocid="playlists.empty_state"
        >
          <ListMusic className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">
            No playlists yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first playlist to start collecting tracks.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id.toString()} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
