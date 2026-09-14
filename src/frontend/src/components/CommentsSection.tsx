import type { CommentView } from "@/backend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddComment,
  useCommentCount,
  useComments,
  useReplyToComment,
} from "@/hooks/useQueries";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

function shortPrincipal(principal: string): string {
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ReplyForm({
  postId,
  parentId,
  onDone,
}: {
  postId: bigint;
  parentId: bigint;
  onDone: () => void;
}) {
  const replyMutation = useReplyToComment(postId, parentId);
  const [text, setText] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || replyMutation.isPending) return;
    setText("");
    replyMutation.mutate(value, {
      onSuccess: () => onDone(),
      onError: () => setText((c) => (c === "" ? value : c)),
    });
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex items-start gap-2"
      data-ocid="post.reply_form"
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply…"
        rows={2}
        maxLength={500}
        data-ocid="post.reply_input"
      />
      <Button
        type="submit"
        disabled={!text.trim() || replyMutation.isPending}
        data-ocid="post.reply_submit_button"
      >
        Reply
      </Button>
    </form>
  );
}

function CommentItem({
  comment,
  postId,
  replies,
}: {
  comment: CommentView;
  postId: bigint;
  replies: CommentView[];
}) {
  const [showReply, setShowReply] = useState(false);
  return (
    <div className="comment-card" data-ocid="post.comment_item">
      <div className="flex items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/20 text-[10px] font-display text-primary">
            {comment.author.toString().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium">
          {shortPrincipal(comment.author.toString())}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(comment.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">
        {comment.text}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowReply((s) => !s)}
          className="text-xs text-muted-foreground transition-colors hover:text-primary"
          data-ocid="post.reply_button"
        >
          Reply
        </button>
        {comment.replyCount > 0n && (
          <span className="text-xs text-muted-foreground">
            {comment.replyCount.toString()} replies
          </span>
        )}
      </div>
      {showReply && (
        <ReplyForm
          postId={postId}
          parentId={comment.id}
          onDone={() => setShowReply(false)}
        />
      )}
      {replies.length > 0 && (
        <div className="comment-reply mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id.toString()}
              comment={reply}
              postId={postId}
              replies={[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ postId }: { postId: bigint }) {
  const { isAuthenticated, login } = useInternetIdentity();
  const commentsQuery = useComments(postId);
  const countQuery = useCommentCount(postId);
  const addComment = useAddComment(postId);
  const [commentText, setCommentText] = useState("");

  const comments = commentsQuery.data ?? [];
  const topLevel = comments
    .filter((c) => c.parentId === undefined)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const repliesByParent = new Map<bigint, CommentView[]>();
  for (const c of comments) {
    if (c.parentId !== undefined) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || addComment.isPending) return;
    setCommentText("");
    addComment.mutate(text, {
      onError: () => setCommentText((c) => (c === "" ? text : c)),
    });
  };

  return (
    <section className="mt-6" data-ocid="post.comments_section">
      <h2 className="mb-3 font-display text-lg font-bold">
        Comments
        {countQuery.data !== undefined && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {countQuery.data.toString()}
          </span>
        )}
      </h2>

      {isAuthenticated ? (
        <form
          onSubmit={handleComment}
          className="mb-4 space-y-2"
          data-ocid="post.comment_form"
        >
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={500}
            data-ocid="post.comment_input"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!commentText.trim() || addComment.isPending}
              data-ocid="post.comment_submit_button"
            >
              {addComment.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        </form>
      ) : (
        <div
          className="mb-4 rounded-2xl border border-border/60 bg-card p-4 text-center"
          data-ocid="post.comment_signin_prompt"
        >
          <p className="text-sm text-muted-foreground">
            Sign in to join the conversation.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => login()}
            data-ocid="post.comment_signin_button"
          >
            Sign in
          </Button>
        </div>
      )}

      {commentsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((id) => (
            <Skeleton key={id} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"
          data-ocid="post.comments_empty_state"
        >
          <MessageCircle className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id.toString()}
              comment={comment}
              postId={postId}
              replies={repliesByParent.get(comment.id) ?? []}
            />
          ))}
        </div>
      )}
    </section>
  );
}
