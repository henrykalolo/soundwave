import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import Home from "@/pages/Home";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getFeed = vi.fn();
const likePost = vi.fn();
const unlikePost = vi.fn();
const repostPost = vi.fn();
const unrepostPost = vi.fn();
const recordPlay = vi.fn();
const deletePost = vi.fn();
const getRecommendations = vi.fn();
const login = vi.fn();

// Toggle the caller's sign-in state so the same mock drives both the
// authenticated write flows and the signed-out gating behavior.
let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({
    actor: {
      getFeed,
      likePost,
      unlikePost,
      repostPost,
      unrepostPost,
      recordPlay,
      deletePost,
      getRecommendations,
    },
    isFetching: false,
  }),
  useInternetIdentity: () => ({ isAuthenticated, login }),
}));

// `@/backend` transitively imports `@caffeineai/object-storage`, whose installed
// package fails to load in this environment; mock it so the component renders.
vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

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

function makePost(
  id: bigint,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    title,
    caption: "caption",
    likeCount: 1n,
    repostCount: 2n,
    playCount: 3n,
    createdAt: 0n,
    filename: `${title}.mp3`,
    uploader: Principal.fromText("aaaaa-aa"),
    likedByCaller: false,
    repostedByCaller: false,
    audio: { getDirectURL: () => `https://example.com/${title}.mp3` },
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

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
    useAudioPlayer.setState({
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      queue: [],
      queueIndex: -1,
    });
    getFeed.mockResolvedValue({ posts: [], nextCursor: undefined });
    getRecommendations.mockResolvedValue([]);
  });

  it("renders the feed with posts returned by the backend", async () => {
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive")],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    expect(await screen.findByText("Midnight Drive")).toBeInTheDocument();
    expect(screen.getByText("3 plays")).toBeInTheDocument();
  });

  it("shows an empty state when the feed has no posts", async () => {
    renderWithQuery(<Home />);
    expect(await screen.findByText("No tracks yet")).toBeInTheDocument();
  });

  it("switches between For You and Following tabs", async () => {
    const user = userEvent.setup();
    getFeed.mockResolvedValue({ posts: [], nextCursor: undefined });
    renderWithQuery(<Home />);
    await screen.findByText("No tracks yet");
    await user.click(screen.getByText("Following"));
    await waitFor(() => {
      expect(getFeed).toHaveBeenCalledWith("following", null, 20n);
    });
  });

  it("calls likePost when a post is liked", async () => {
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive", { likedByCaller: false })],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Like"));
    await waitFor(() => expect(likePost).toHaveBeenCalledWith(1n));
  });

  it("calls unlikePost when an already-liked post is unliked", async () => {
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive", { likedByCaller: true })],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Unlike"));
    await waitFor(() => expect(unlikePost).toHaveBeenCalledWith(1n));
  });

  it("calls repostPost when a post is reposted", async () => {
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive", { repostedByCaller: false })],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Repost"));
    await waitFor(() => expect(repostPost).toHaveBeenCalledWith(1n));
  });

  it("records a play and starts playback when a track is played", async () => {
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive")],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Play"));
    await waitFor(() => expect(recordPlay).toHaveBeenCalledWith(1n));
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("1");
    expect(useAudioPlayer.getState().isPlaying).toBe(true);
  });

  it("shows an error state with a retry button when the feed fails", async () => {
    getFeed.mockRejectedValue(new Error("boom"));
    renderWithQuery(<Home />);
    expect(
      await screen.findByText("Couldn't load the feed"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("prompts sign-in instead of liking when the caller is signed out", async () => {
    isAuthenticated = false;
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive", { likedByCaller: false })],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Like"));
    expect(login).toHaveBeenCalled();
    expect(likePost).not.toHaveBeenCalled();
  });

  it("prompts sign-in instead of reposting when the caller is signed out", async () => {
    isAuthenticated = false;
    const user = userEvent.setup();
    getFeed.mockResolvedValue({
      posts: [makePost(1n, "Midnight Drive", { repostedByCaller: false })],
      nextCursor: undefined,
    });
    renderWithQuery(<Home />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Repost"));
    expect(login).toHaveBeenCalled();
    expect(repostPost).not.toHaveBeenCalled();
  });

  it("renders recommended posts returned by the backend", async () => {
    getRecommendations.mockResolvedValue([makePost(9n, "Recommended Track")]);
    renderWithQuery(<Home />);
    expect(await screen.findByText("Recommended Track")).toBeInTheDocument();
  });

  it("shows an empty state when there are no recommendations", async () => {
    renderWithQuery(<Home />);
    expect(
      await screen.findByText("No recommendations yet"),
    ).toBeInTheDocument();
  });
});
