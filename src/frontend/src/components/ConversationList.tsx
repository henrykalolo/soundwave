import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "@/types";
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

function shortPrincipal(principal: string): string {
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
        <Skeleton key={id} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function ConversationListEmpty() {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
      data-ocid="messages.empty_state"
    >
      <MessageSquare className="mx-auto size-10 text-muted-foreground" />
      <p className="mt-3 font-display text-lg font-semibold">
        No conversations yet
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Visit an artist&apos;s profile and start a conversation to begin
        chatting.
      </p>
    </div>
  );
}

export function ConversationList({
  conversations,
}: {
  conversations: Conversation[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id.toString()}
          to="/messages/$conversationId"
          params={{ conversationId: conversation.id.toString() }}
          className="conversation-item"
          data-ocid="messages.conversation_item"
        >
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="bg-primary/20 font-display text-primary">
              {conversation.otherUser.toString().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-sm font-semibold">
                {shortPrincipal(conversation.otherUser.toString())}
              </p>
              {conversation.lastMessageAt !== undefined && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(conversation.lastMessageAt)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-muted-foreground">
                {conversation.lastMessage ?? "Start the conversation"}
              </p>
              {conversation.unreadCount > 0n && (
                <span
                  className="unread-dot shrink-0"
                  aria-label={`${conversation.unreadCount.toString()} unread messages`}
                />
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
