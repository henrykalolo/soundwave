import {
  ConversationList,
  ConversationListEmpty,
} from "@/components/ConversationList";
import {
  ConversationThread,
  ConversationThreadEmpty,
} from "@/components/ConversationThread";
import type { Conversation, Message } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
    <a
      href={`${to}${params ? `/${params.conversationId ?? ""}` : ""}`}
      {...rest}
    >
      {children}
    </a>
  ),
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 1n,
    createdAt: 0n,
    text: "Hello there",
    sender: Principal.fromText("aaaaa-aa"),
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1n,
    otherUser: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
    unreadCount: 0n,
    ...overrides,
  };
}

describe("ConversationThread", () => {
  it("renders messages and marks the caller's own as 'You'", () => {
    render(
      <ConversationThread
        messages={[
          makeMessage({
            id: 1n,
            text: "Hi",
            sender: Principal.fromText("aaaaa-aa"),
          }),
          makeMessage({
            id: 2n,
            text: "Hey!",
            sender: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
          }),
        ]}
        caller="aaaaa-aa"
        onSend={async () => true}
        isSending={false}
      />,
    );
    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("Hey!")).toBeInTheDocument();
    expect(screen.getAllByText("You")).toHaveLength(1);
  });

  it("sends a message through onSend and clears the draft", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(true);
    render(
      <ConversationThread
        messages={[]}
        caller="aaaaa-aa"
        onSend={onSend}
        isSending={false}
      />,
    );
    await user.type(screen.getByPlaceholderText("Write a message…"), "New msg");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("New msg");
  });

  it("shows an empty state when there are no messages", () => {
    render(<ConversationThreadEmpty />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });
});

describe("ConversationList", () => {
  it("renders conversations and links to each thread", () => {
    render(
      <ConversationList
        conversations={[
          makeConversation({
            id: 5n,
            lastMessage: "See you soon",
            lastMessageAt: 0n,
          }),
        ]}
      />,
    );
    expect(screen.getByText("See you soon")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/messages/$conversationId/5");
  });

  it("shows an empty state when there are no conversations", () => {
    render(<ConversationListEmpty />);
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });
});
