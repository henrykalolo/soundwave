import type { PostView, UserProfile } from "@/backend";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import Profile from "@/pages/Profile";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProfile = vi.fn();
const getUserPosts = vi.fn();
const getUserReposts = vi.fn();
const recordPlay = vi.fn();
const startConversation = vi.fn();
const getPlaylists = vi.fn();

// The caller's identity drives `isOwnProfile`; default to a signed-in caller
// viewing someone else's profile so the follow seam is exercised.
let callerPrincipal = "aaaaa-aa";
let profilePrincipal = "ryjl3-tyaaa-aaaaa-aaaba-cai";
let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({
    actor: {
      getProfile,
      getUserPosts,
      getUserReposts,
      recordPlay,
      startConversation,
      getPlaylists,
    },
    isFetching: false,
  }),
  useInternetIdentity: () => ({
    isAuthenticated,
    identity: isAuthenticated
      ? { getPrincipal: () => ({ toString: () => callerPrincipal }) }
      : null,
  }),
}));

// `@/backend` transitively imports `@caffeineai/object-storage`, whose installed
// package fails to load in this environment; mock it so the component renders.
vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ principal: profilePrincipal }),
  useNavigate: () => navigate,
}));

function makePost(id: bigint, title: string): PostView {
  return {
    id,
    title,
    caption: "caption",
    likeCount: 1n,
    repostCount: 2n,
    playCount: 3n,
    createdAt: 0n,
    filename: `${title}.mp3`,
    uploader: Principal.fromText(profilePrincipal),
    likedByCaller: false,
    repostedByCaller: false,
    audio: { getDirectURL: () => `https://example.com/${title}.mp3` } as never,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    principal: Principal.fromText(profilePrincipal),
    isFollowing: false,
    followerCount: 5n,
    followingCount: 3n,
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

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerPrincipal = "aaaaa-aa";
    profilePrincipal = "ryjl3-tyaaa-aaaaa-aaaba-cai";
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
    getProfile.mockResolvedValue(makeProfile());
    getUserPosts.mockResolvedValue([]);
    getUserReposts.mockResolvedValue([]);
  });

  it("renders the profile header with the user's uploaded posts", async () => {
    getUserPosts.mockResolvedValue([makePost(1n, "Midnight Drive")]);
    renderWithQuery(<Profile />);
    expect(await screen.findByText("Midnight Drive")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
  });

  it("shows an empty state when the user has no uploads", async () => {
    renderWithQuery(<Profile />);
    expect(await screen.findByText("No uploads yet")).toBeInTheDocument();
  });

  it("switches to the reposts tab and lists the user's reposts", async () => {
    const user = userEvent.setup();
    getUserReposts.mockResolvedValue([makePost(2n, "Reposted Track")]);
    renderWithQuery(<Profile />);
    await screen.findByText("No uploads yet");
    await user.click(screen.getByRole("tab", { name: "Reposts" }));
    expect(await screen.findByText("Reposted Track")).toBeInTheDocument();
  });

  it("records a play when a post's play button is clicked", async () => {
    const user = userEvent.setup();
    getUserPosts.mockResolvedValue([makePost(1n, "Midnight Drive")]);
    renderWithQuery(<Profile />);
    await screen.findByText("Midnight Drive");
    await user.click(screen.getByLabelText("Play Midnight Drive"));
    await waitFor(() => expect(recordPlay).toHaveBeenCalledWith(1n));
    expect(useAudioPlayer.getState().currentTrack?.id).toBe("1");
  });

  it("shows a Follow button on another user's profile", async () => {
    renderWithQuery(<Profile />);
    expect(
      await screen.findByRole("button", { name: "Follow" }),
    ).toBeInTheDocument();
  });

  it("does not show a Follow button on the caller's own profile", async () => {
    callerPrincipal = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    renderWithQuery(<Profile />);
    await screen.findByText("Followers");
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
  });

  it("starts a conversation with another user from their profile", async () => {
    startConversation.mockResolvedValue(7n);
    const user = userEvent.setup();
    renderWithQuery(<Profile />);
    await screen.findByText("Followers");
    await user.click(screen.getByRole("button", { name: "Message" }));
    await waitFor(() =>
      expect(startConversation).toHaveBeenCalledWith(
        Principal.fromText(profilePrincipal),
      ),
    );
  });

  it("prompts sign-in before starting a conversation when signed out", async () => {
    isAuthenticated = false;
    const user = userEvent.setup();
    renderWithQuery(<Profile />);
    await screen.findByText("Followers");
    await user.click(screen.getByRole("button", { name: "Message" }));
    expect(await screen.findByText("Sign in to message")).toBeInTheDocument();
    expect(startConversation).not.toHaveBeenCalled();
  });
});
