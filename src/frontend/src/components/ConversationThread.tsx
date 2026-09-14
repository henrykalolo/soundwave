import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Message } from "@/types";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function shortPrincipal(principal: string): string {
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConversationThreadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
        <Skeleton key={id} className="h-10 w-2/3 rounded-2xl" />
      ))}
    </div>
  );
}

export function ConversationThreadEmpty() {
  return (
    <div
      className="flex flex-col items-center gap-2 py-10 text-center"
      data-ocid="conversation.empty_state"
    >
      <p className="font-display text-base font-semibold">No messages yet</p>
      <p className="text-sm text-muted-foreground">
        Say hello to start the conversation.
      </p>
    </div>
  );
}

export function ConversationThread({
  messages,
  caller,
  onSend,
  isSending,
}: {
  messages: Message[];
  caller: string;
  onSend: (text: string) => Promise<boolean>;
  isSending: boolean;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = messages.length;

  useEffect(() => {
    if (messageCount > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    const ok = await onSend(text);
    if (!ok) {
      setDraft((current) => (current === "" ? text : current));
    }
  };

  return (
    <>
      <div className="h-[60vh] space-y-3 overflow-y-auto rounded-2xl border border-border bg-thread p-4">
        {messages.map((message) => {
          const isOwn = message.sender.toString() === caller;
          return (
            <div
              key={message.id.toString()}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Avatar className="size-4">
                    <AvatarFallback className="bg-primary/20 text-[8px] font-display text-primary">
                      {message.sender.toString().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium opacity-70">
                    {isOwn ? "You" : shortPrincipal(message.sender.toString())}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {message.text}
                </p>
                <p className="mt-1 text-right text-[10px] opacity-60">
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex items-center gap-2"
        data-ocid="conversation.form"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          maxLength={1000}
          data-ocid="conversation.input"
        />
        <Button
          type="submit"
          disabled={!draft.trim() || isSending}
          data-ocid="conversation.send_button"
        >
          <Send className="size-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </>
  );
}
