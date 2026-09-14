import {
  ConversationThread,
  ConversationThreadEmpty,
  ConversationThreadSkeleton,
} from "@/components/ConversationThread";
import { Button } from "@/components/ui/button";
import {
  useConversation,
  useMarkConversationRead,
  useSendMessage,
} from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

export default function MessagesConversation() {
  const { conversationId } = useParams({ from: "/messages/$conversationId" });
  const { identity } = useInternetIdentity();
  const caller = identity?.getPrincipal().toString() ?? "";
  const markedRef = useRef(false);

  const id = BigInt(conversationId);
  const { data: messages, isLoading, isError, refetch } = useConversation(id);
  const sendMutation = useSendMessage(id);
  const markRead = useMarkConversationRead(id);

  useEffect(() => {
    if (messages && messages.length > 0 && !markedRef.current) {
      markedRef.current = true;
      markRead.mutate();
    }
  }, [messages, markRead]);

  const handleSend = async (text: string): Promise<boolean> => {
    try {
      await sendMutation.mutateAsync(text);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4" data-ocid="conversation.page">
      <div className="mb-3 flex items-center gap-2">
        <Link
          to="/messages"
          data-ocid="conversation.back_link"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Messages
        </Link>
        <h1 className="font-display text-lg font-bold">Conversation</h1>
      </div>

      {isLoading ? (
        <ConversationThreadSkeleton />
      ) : isError ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-thread py-10 text-center"
          data-ocid="conversation.error_state"
        >
          <p className="font-display text-base font-semibold">
            Couldn&apos;t load this conversation
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            data-ocid="conversation.retry_button"
          >
            Retry
          </Button>
        </div>
      ) : !messages || messages.length === 0 ? (
        <ConversationThreadEmpty />
      ) : (
        <ConversationThread
          messages={messages}
          caller={caller}
          onSend={handleSend}
          isSending={sendMutation.isPending}
        />
      )}
    </div>
  );
}
