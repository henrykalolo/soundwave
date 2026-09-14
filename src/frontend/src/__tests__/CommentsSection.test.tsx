import type { CommentView } from "@/backend";
import CommentsSection from "@/components/CommentsSection";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getComments = vi.fn();
const getCommentCount = vi.fn();
const addComment = vi.fn();
const replyToComment = vi.fn();
const login = vi.fn();

let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({
    actor: { getComments, getCommentCount, addComment, replyToComment },
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

function makeComment(overrides: Partial<CommentView> = {}): CommentView {
  return {
    id: 1n,
    createdAt: 0n,
    text: "Great track!",
    author: Principal.fromText("aaaaa-aa"),
    replyCount: 0n,
    parentId: undefined,
    postId: 1n,
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

describe("CommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
    getComments.mockResolvedValue([]);
    getCommentCount.mockResolvedValue(0n);
  });

  it("shows an empty state when a post has no comments", async () => {
    renderWithQuery(<CommentsSection postId={1n} />);
    expect(
      await screen.findByText(
        "No comments yet. Be the first to share your thoughts.",
      ),
    ).toBeInTheDocument();
  });

  it("lists top-level comments and their reply counts", async () => {
    getComments.mockResolvedValue([
      makeComment({ id: 1n, text: "Love this", replyCount: 2n }),
    ]);
    getCommentCount.mockResolvedValue(1n);
    renderWithQuery(<CommentsSection postId={1n} />);
    expect(await screen.findByText("Love this")).toBeInTheDocument();
    expect(screen.getByText("2 replies")).toBeInTheDocument();
  });

  it("adds a comment and calls the backend", async () => {
    addComment.mockResolvedValue(1n);
    const user = userEvent.setup();
    renderWithQuery(<CommentsSection postId={1n} />);
    await screen.findByText(
      "No comments yet. Be the first to share your thoughts.",
    );
    await user.type(screen.getByPlaceholderText("Add a comment…"), "Nice one");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() =>
      expect(addComment).toHaveBeenCalledWith(1n, "Nice one"),
    );
  });

  it("replies to a comment and calls the backend", async () => {
    replyToComment.mockResolvedValue(2n);
    getComments.mockResolvedValue([makeComment({ id: 1n, text: "Love this" })]);
    const user = userEvent.setup();
    renderWithQuery(<CommentsSection postId={1n} />);
    await screen.findByText("Love this");
    await user.click(screen.getByTestId("post.reply_button"));
    await user.type(screen.getByPlaceholderText("Write a reply…"), "Agreed");
    await user.click(screen.getByTestId("post.reply_submit_button"));
    await waitFor(() =>
      expect(replyToComment).toHaveBeenCalledWith(1n, 1n, "Agreed"),
    );
  });

  it("prompts sign-in instead of commenting when signed out", async () => {
    isAuthenticated = false;
    renderWithQuery(<CommentsSection postId={1n} />);
    expect(
      await screen.findByText("Sign in to join the conversation."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(login).toHaveBeenCalled();
    expect(addComment).not.toHaveBeenCalled();
  });
});
