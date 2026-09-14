import type { UserProfile } from "@/backend";
import ProfileHeader from "@/components/ProfileHeader";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const followUser = vi.fn();
const unfollowUser = vi.fn();

let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({ isAuthenticated }),
  useActor: () => ({ actor: { followUser, unfollowUser }, isFetching: false }),
}));

// `@/backend` transitively imports `@caffeineai/object-storage`, whose installed
// package fails to load in this environment; mock it so the component renders.
vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    principal: Principal.fromText("aaaaa-aa"),
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

describe("ProfileHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
  });

  it("shows follower and following counts", () => {
    renderWithQuery(
      <ProfileHeader profile={makeProfile()} isOwnProfile={false} />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
  });

  it("shows a Follow button for another user's profile", () => {
    renderWithQuery(
      <ProfileHeader profile={makeProfile()} isOwnProfile={false} />,
    );
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("does not show a follow button on the caller's own profile", () => {
    renderWithQuery(
      <ProfileHeader profile={makeProfile()} isOwnProfile={true} />,
    );
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
  });

  it("calls followUser when not yet following", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <ProfileHeader
        profile={makeProfile({ isFollowing: false })}
        isOwnProfile={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Follow" }));
    expect(followUser).toHaveBeenCalledWith(Principal.fromText("aaaaa-aa"));
  });

  it("calls unfollowUser when already following", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <ProfileHeader
        profile={makeProfile({ isFollowing: true })}
        isOwnProfile={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Following" }));
    expect(unfollowUser).toHaveBeenCalledWith(Principal.fromText("aaaaa-aa"));
  });

  it("does not show a follow button when the caller is signed out", () => {
    isAuthenticated = false;
    renderWithQuery(
      <ProfileHeader profile={makeProfile()} isOwnProfile={false} />,
    );
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Following" }),
    ).not.toBeInTheDocument();
  });
});
