import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import {
  AudioLines,
  ListMusic,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";

export default function Header() {
  const { isAuthenticated, identity, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  const handleSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-subtle">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-bold"
          data-ocid="header.logo_link"
        >
          <AudioLines className="size-6 text-primary" />
          <span className="text-gradient">SoundWave</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            aria-label="Search"
            data-ocid="header.search_button"
          >
            <Search className="size-5" />
          </Button>

          {isAuthenticated && (
            <>
              <Link
                to="/messages"
                data-ocid="header.messages_link"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">Messages</span>
              </Link>
              <Link
                to="/playlists"
                data-ocid="header.playlists_link"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ListMusic className="size-4" />
                <span className="hidden sm:inline">Playlists</span>
              </Link>
            </>
          )}

          {isAuthenticated && principal ? (
            <Link
              to="/upload"
              data-ocid="header.upload_link"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          ) : null}

          {isAuthenticated && principal ? (
            <Link
              to="/profile/$principal"
              params={{ principal }}
              data-ocid="header.profile_link"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/20 font-display text-primary">
                  {principal.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button
              type="button"
              onClick={() => login()}
              disabled={isInitializing || isLoggingIn}
              data-ocid="header.login_button"
            >
              {isLoggingIn ? "Signing in…" : "Sign in"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
