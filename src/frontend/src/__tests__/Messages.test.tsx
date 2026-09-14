import Messages from "@/pages/Messages";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConversations = vi.fn();
const login = vi.fn();

let isAuthenticated = true;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({
    actor: { getConversations },
    isFetching: false,
  }),
  useInternetIdentity: () => ({
    isAuthenticated,
    login,
    isInitializing: false,
    isLoggingIn: false,
  }),
}));

vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({ withUploadProgress: () => ({}) }),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...rest}>{children}</a>
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

describe("Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
    getConversations.mockResolvedValue([]);
  });

  it("shows an empty state when the signed-in user has no conversations", async () => {
    renderWithQuery(<Messages />);
    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });

  it("prompts sign-in instead of showing messages when signed out", async () => {
    isAuthenticated = false;
    renderWithQuery(<Messages />);
    expect(await screen.findByText("Sign in to message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    // The conversation list is not rendered for a signed-out caller.
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
  });
});
