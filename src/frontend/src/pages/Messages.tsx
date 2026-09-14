import {
  ConversationList,
  ConversationListEmpty,
  ConversationListSkeleton,
} from "@/components/ConversationList";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { MessageSquare } from "lucide-react";

export default function Messages() {
  const { isAuthenticated, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
  } = useConversations();

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8" data-ocid="messages.page">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
          data-ocid="messages.signin_prompt"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <MessageSquare className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">
            Sign in to message
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Start private conversations with other artists on SoundWave.
          </p>
          <Button
            type="button"
            onClick={() => login()}
            disabled={isInitializing || isLoggingIn}
            data-ocid="messages.signin_button"
          >
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" data-ocid="messages.page">
      <h1 className="mb-4 font-display text-2xl font-bold">Messages</h1>

      {isLoading ? (
        <ConversationListSkeleton />
      ) : isError ? (
        <div
          className="rounded-2xl border border-border/60 bg-card p-8 text-center"
          data-ocid="messages.error_state"
        >
          <p className="font-display text-lg font-semibold">
            Couldn&apos;t load conversations
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => refetch()}
            data-ocid="messages.retry_button"
          >
            Retry
          </Button>
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <ConversationListEmpty />
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
