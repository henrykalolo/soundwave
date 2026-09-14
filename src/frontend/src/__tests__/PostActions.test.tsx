import type { PostView } from "@/backend";
import PostActions from "@/components/PostActions";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// `@/backend` transitively imports `@caffeineai/object-storage`, whose installed
// package fails to load in this environment; mock it so the component renders.
vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

// PostActions reads the caller's sign-in state via `useInternetIdentity` and
// the caller's playlists via `usePlaylists`, which needs `useActor` and a
// QueryClient. The mock identity is null, so the playlists query stays disabled.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: {}, isFetching: false }),
  useInternetIdentity: () => ({
    isAuthenticated: true,
    identity: null,
    login: vi.fn(),
  }),
}));

// PostActions renders a `Link` to the post detail page; mock it to a plain
// anchor so the component renders without a RouterProvider.
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
    <a href={`${to}${params ? `/${params.postId ?? ""}` : ""}`} {...rest}>
      {children}
    </a>
  ),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

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

describe("PostActions", () => {
  it("renders like, repost, share, and download actions with live counts", () => {
    renderWithQuery(
      <PostActions
        post={makePost()}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
        canDelete={false}
      />,
    );
    expect(screen.getByLabelText("Like")).toBeInTheDocument();
    expect(screen.getByLabelText("Repost")).toBeInTheDocument();
    expect(screen.getByLabelText("Share post")).toBeInTheDocument();
    expect(screen.getByLabelText("Download audio")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not render a delete button when the caller cannot delete", () => {
    renderWithQuery(
      <PostActions
        post={makePost()}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
        canDelete={false}
      />,
    );
    expect(screen.queryByLabelText("Delete post")).not.toBeInTheDocument();
  });

  it("renders a delete button when the caller can delete", () => {
    renderWithQuery(
      <PostActions
        post={makePost()}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
        canDelete={true}
      />,
    );
    expect(screen.getByLabelText("Delete post")).toBeInTheDocument();
  });

  it("calls onLike and onRepost with the post", async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    const onRepost = vi.fn();
    const post = makePost();
    renderWithQuery(
      <PostActions
        post={post}
        commentCount={0n}
        onLike={onLike}
        onRepost={onRepost}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
        canDelete={false}
      />,
    );
    await user.click(screen.getByLabelText("Like"));
    expect(onLike).toHaveBeenCalledWith(post);
    await user.click(screen.getByLabelText("Repost"));
    expect(onRepost).toHaveBeenCalledWith(post);
  });

  it("calls onShare and shows a copied confirmation", async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    const post = makePost();
    renderWithQuery(
      <PostActions
        post={post}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={onShare}
        onDownload={() => {}}
        onDelete={() => {}}
        canDelete={false}
      />,
    );
    await user.click(screen.getByLabelText("Share post"));
    expect(onShare).toHaveBeenCalledWith(post);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("calls onDownload when the download button is clicked", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const post = makePost();
    renderWithQuery(
      <PostActions
        post={post}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={onDownload}
        onDelete={() => {}}
        canDelete={false}
      />,
    );
    await user.click(screen.getByLabelText("Download audio"));
    expect(onDownload).toHaveBeenCalledWith(post);
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const post = makePost();
    renderWithQuery(
      <PostActions
        post={post}
        commentCount={0n}
        onLike={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
        onDownload={() => {}}
        onDelete={onDelete}
        canDelete={true}
      />,
    );
    await user.click(screen.getByLabelText("Delete post"));
    expect(onDelete).toHaveBeenCalledWith(post);
  });
});
