import type { PostView } from "@/backend";
import MusicPostCard from "@/components/MusicPostCard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCommentCount = vi.fn();

// `@/backend` transitively imports `@caffeineai/object-storage`, whose installed
// package fails to load in this environment; mock it so the component renders.
vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

// Mock the identity/auth seam; MusicPostCard reads `identity` and the comment
// count via `useCommentCount`, which needs `useActor` and a QueryClient.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: { getCommentCount }, isFetching: false }),
  useInternetIdentity: () => ({ identity: null }),
}));

// Mock the router Link to a plain anchor so we can assert navigation targets.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => (
    <a href={`${to}${params ? `/${params.principal ?? ""}` : ""}`} {...rest}>
      {children}
    </a>
  ),
}));

function makePost(overrides: Partial<PostView> = {}): PostView {
  return {
    id: 1n,
    title: "Midnight Drive",
    caption: "a late-night beat",
    likeCount: 3n,
    repostCount: 2n,
    playCount: 10n,
    createdAt: 0n,
    filename: "track.mp3",
    uploader: Principal.fromText("aaaaa-aa"),
    likedByCaller: false,
    repostedByCaller: false,
    audio: { getDirectURL: () => "https://example.com/track.mp3" } as never,
    ...overrides,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("MusicPostCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCommentCount.mockResolvedValue(0n);
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

  it("renders title, caption, uploader, and play/like/repost counts", () => {
    renderWithQuery(
      <MusicPostCard
        post={makePost()}
        onPlay={() => {}}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Midnight Drive")).toBeInTheDocument();
    expect(screen.getByText("a late-night beat")).toBeInTheDocument();
    expect(screen.getByText("10 plays")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("links the uploader to their profile", () => {
    renderWithQuery(
      <MusicPostCard
        post={makePost()}
        onPlay={() => {}}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
      />,
    );
    const link = screen.getByLabelText(/profile/i);
    expect(link).toHaveAttribute("href", "/profile/$principal/aaaaa-aa");
  });

  it("calls onPlay when the play button is clicked for a non-current track", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const post = makePost();
    renderWithQuery(
      <MusicPostCard
        post={post}
        onPlay={onPlay}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
      />,
    );
    await user.click(screen.getByLabelText("Play"));
    expect(onPlay).toHaveBeenCalledWith(post);
  });

  it("toggles playback when the current track's play button is clicked", async () => {
    const user = userEvent.setup();
    const post = makePost();
    useAudioPlayer.getState().playTrack({
      id: "1",
      title: "Midnight Drive",
      artist: "a",
      caption: "a late-night beat",
      uploader: {
        principal: "aaaaa-aa",
        name: "u",
        handle: "u",
        bio: "",
        avatar: null,
        followerCount: 0n,
        followingCount: 0n,
      },
      audio: { getDirectURL: () => "https://example.com/track.mp3" } as never,
      artwork: null,
      playCount: 0n,
      likeCount: 0n,
      repostCount: 0n,
      createdAt: 0n,
      likedByMe: false,
      repostedByMe: false,
    });
    const onPlay = vi.fn();
    renderWithQuery(
      <MusicPostCard
        post={post}
        onPlay={onPlay}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
      />,
    );
    // The current track is playing, so the button is a Pause toggle.
    await user.click(screen.getByLabelText("Pause"));
    expect(onPlay).not.toHaveBeenCalled();
    expect(useAudioPlayer.getState().isPlaying).toBe(false);
  });
});
