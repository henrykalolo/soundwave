import Playlists from "@/pages/Playlists";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPlaylists = vi.fn();
const createPlaylist = vi.fn();
const login = vi.fn();

let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({
    actor: { getPlaylists, createPlaylist },
    isFetching: false,
  }),
  useInternetIdentity: () => ({
    isAuthenticated,
    login,
    isInitializing: false,
    isLoggingIn: false,
    identity: isAuthenticated
      ? { getPrincipal: () => Principal.fromText("aaaaa-aa") }
      : null,
  }),
}));

vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("Playlists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
    getPlaylists.mockResolvedValue([]);
  });

  it("shows an empty state when the signed-in user has no playlists", async () => {
    renderWithQuery(<Playlists />);
    expect(await screen.findByText("No playlists yet")).toBeInTheDocument();
  });

  it("creates a playlist with the entered name", async () => {
    createPlaylist.mockResolvedValue(1n);
    const user = userEvent.setup();
    renderWithQuery(<Playlists />);
    await screen.findByText("No playlists yet");
    await user.type(
      screen.getByPlaceholderText("New playlist name"),
      "Road Trip",
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(createPlaylist).toHaveBeenCalledWith("Road Trip"),
    );
  });

  it("prompts sign-in instead of showing playlists when signed out", async () => {
    isAuthenticated = false;
    renderWithQuery(<Playlists />);
    expect(
      await screen.findByText("Sign in to view playlists"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(getPlaylists).not.toHaveBeenCalled();
  });
});
