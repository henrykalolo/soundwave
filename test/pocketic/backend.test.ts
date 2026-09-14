import { PocketIc, createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: _SERVICE;
let canisterId: ReturnType<ReturnType<typeof createIdentity>["getPrincipal"]>;

// `@icp-sdk/core` is not resolvable from this lane (it lives only in the
// frontend package), so principals come from `@dfinity/pic`'s own
// `createIdentity`, which is resolvable here. The anonymous caller is exercised
// through a fresh actor whose default sender is anonymous.
const alice = createIdentity("alice-seed").getPrincipal();
const bob = createIdentity("bob-seed").getPrincipal();
const carol = createIdentity("carol-seed").getPrincipal();

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    const installed = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BACKEND_WASM });
    actor = installed.actor;
    canisterId = installed.canisterId;
  } else {
    // `[baseline, current]`, the same install contract the hosted deploy uses for
    // a converted project. The upgrade replays the chain from the legacy schema.
    const installed = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BASELINE_WASM });
    await pic.upgradeCanister({ canisterId: installed.canisterId, wasm: BACKEND_WASM, arg: new Uint8Array() });
    actor = installed.actor;
    canisterId = installed.canisterId;
  }
  // Register the test callers so `requireUser` passes. The first caller becomes
  // admin, the second a user; both satisfy the `#user` permission check.
  actor.setPrincipal(alice);
  await actor._initialize_access_control();
  actor.setPrincipal(bob);
  await actor._initialize_access_control();
  actor.setPrincipal(carol);
  await actor._initialize_access_control();
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

it("answers an empty-state feed read instead of trapping", async () => {
  actor.setPrincipal(alice);
  const page = await actor.getFeed({ forYou: null }, [], 20n);
  expect(page.posts).toEqual([]);
});

it("round-trips an upload through the real canister and surfaces it in the feed", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("Midnight Drive", "a late-night beat", new Uint8Array([1, 2, 3]), "track.mp3");
  const page = await actor.getFeed({ forYou: null }, [], 20n);
  expect(page.posts).toContainEqual(
    expect.objectContaining({ id, title: "Midnight Drive", caption: "a late-night beat", uploader: alice }),
  );
});

it("orders the for-you feed by engagement, not just upload time", async () => {
  actor.setPrincipal(alice);
  const older = await actor.uploadPost("Older", "c", new Uint8Array([4]), "a.mp3");
  const newer = await actor.uploadPost("Newer", "c", new Uint8Array([5]), "b.mp3");
  // Like the older post so it outranks the newer one despite being older.
  await actor.likePost(older);
  const page = await actor.getFeed({ forYou: null }, [], 20n);
  const titles = page.posts.map((p) => p.title);
  expect(titles.indexOf("Older")).toBeLessThan(titles.indexOf("Newer"));
});

it("records a play and reflects the incremented count", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("Played", "c", new Uint8Array([6]), "p.mp3");
  await actor.recordPlay(id);
  const post = await actor.getPost(id);
  expect(post).not.toBeNull();
  expect(post![0].playCount).toBe(1n);
});

it("likes and unlikes a post, updating the live count", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("Liked", "c", new Uint8Array([7]), "l.mp3");
  await actor.likePost(id);
  let post = await actor.getPost(id);
  expect(post![0].likeCount).toBe(1n);
  expect(post![0].likedByCaller).toBe(true);
  await actor.unlikePost(id);
  post = await actor.getPost(id);
  expect(post![0].likeCount).toBe(0n);
  expect(post![0].likedByCaller).toBe(false);
});

it("reposts and unreposts a post, surfacing it in the caller's profile feed", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("Reposted", "c", new Uint8Array([8]), "r.mp3");
  await actor.repostPost(id);
  let post = await actor.getPost(id);
  expect(post![0].repostCount).toBe(1n);
  expect(post![0].repostedByCaller).toBe(true);
  // The repost surfaces in the caller's own profile feed.
  const reposts = await actor.getUserReposts(alice);
  expect(reposts.map((p) => p.id)).toContain(id);
  await actor.unrepostPost(id);
  post = await actor.getPost(id);
  expect(post![0].repostCount).toBe(0n);
});

it("only the uploader can delete their own post", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("Deletable", "c", new Uint8Array([9]), "d.mp3");
  // Another caller cannot delete it.
  actor.setPrincipal(bob);
  await expect(actor.deletePost(id)).rejects.toThrow();
  // The uploader can.
  actor.setPrincipal(alice);
  await actor.deletePost(id);
  const post = await actor.getPost(id);
  expect(post).toEqual([]);
});

it("follows and unfollows a user, updating profile counts and the following feed", async () => {
  actor.setPrincipal(alice);
  await actor.followUser(bob);
  let profile = await actor.getProfile(bob);
  expect(profile.followerCount).toBe(1n);
  expect(profile.isFollowing).toBe(true);
  // Bob's posts appear in Alice's following feed.
  actor.setPrincipal(bob);
  const id = await actor.uploadPost("ForFollowers", "c", new Uint8Array([10]), "f.mp3");
  actor.setPrincipal(alice);
  const followingPage = await actor.getFeed({ following: null }, [], 20n);
  expect(followingPage.posts.map((p) => p.id)).toContain(id);
  // Unfollow clears the count.
  await actor.unfollowUser(bob);
  profile = await actor.getProfile(bob);
  expect(profile.followerCount).toBe(0n);
  expect(profile.isFollowing).toBe(false);
});

it("lists a user's uploaded posts on their profile", async () => {
  actor.setPrincipal(alice);
  const id = await actor.uploadPost("ProfilePost", "c", new Uint8Array([11]), "pp.mp3");
  const posts = await actor.getUserPosts(alice);
  expect(posts.map((p) => p.id)).toContain(id);
});

it("rejects anonymous callers from mutating actions", async () => {
  // A fresh actor defaults to the anonymous caller.
  const anonActor = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(anonActor.uploadPost("Nope", "c", new Uint8Array([12]), "n.mp3")).rejects.toThrow();
});

it("starts a private 1:1 conversation and round-trips a message", async () => {
  actor.setPrincipal(alice);
  const convId = await actor.startConversation(bob);
  const messageId = await actor.sendMessage(convId, "Hello Bob");
  // The conversation appears in Alice's list with Bob as the other user.
  const conversations = await actor.getConversations();
  expect(conversations).toContainEqual(
    expect.objectContaining({ id: convId, otherUser: bob }),
  );
  // The thread contains the sent message.
  const thread = await actor.getConversation(convId);
  expect(thread).not.toEqual([]);
  expect(thread![0]).toContainEqual(
    expect.objectContaining({ id: messageId, text: "Hello Bob", sender: alice }),
  );
});

it("does not show a private conversation to a third party", async () => {
  actor.setPrincipal(alice);
  const convId = await actor.startConversation(bob);
  // Both participants see the 1:1 conversation in their lists.
  actor.setPrincipal(bob);
  const bobConversations = await actor.getConversations();
  expect(bobConversations.map((c) => c.id)).toContain(convId);
  // A third party who is not a participant cannot see the private thread.
  actor.setPrincipal(carol);
  const carolConversations = await actor.getConversations();
  expect(carolConversations.map((c) => c.id)).not.toContain(convId);
});

it("adds a comment and a reply, updating the comment count", async () => {
  actor.setPrincipal(alice);
  const postId = await actor.uploadPost("Commented", "c", new Uint8Array([13]), "cm.mp3");
  const commentId = await actor.addComment(postId, "Great track!");
  const replyId = await actor.replyToComment(postId, commentId, "Thanks!");
  const comments = await actor.getComments(postId);
  expect(comments).toContainEqual(
    expect.objectContaining({ id: commentId, text: "Great track!", author: alice }),
  );
  expect(comments).toContainEqual(
    expect.objectContaining({ id: replyId, text: "Thanks!", parentId: [commentId] }),
  );
  expect(await actor.getCommentCount(postId)).toBe(2n);
});

it("creates a playlist, adds a track, and lists it", async () => {
  actor.setPrincipal(alice);
  const postId = await actor.uploadPost("Playlisted", "c", new Uint8Array([14]), "pl.mp3");
  const playlistId = await actor.createPlaylist("Road Trip");
  await actor.addTrackToPlaylist(playlistId, postId);
  const playlists = await actor.getPlaylists(alice);
  expect(playlists).toContainEqual(
    expect.objectContaining({ id: playlistId, name: "Road Trip", trackIds: [postId] }),
  );
});

it("returns recommendations for a signed-in caller", async () => {
  // Recommendations surface posts from users the caller follows. Bob uploads a
  // track, Alice follows Bob, and the track appears in Alice's recommendations.
  actor.setPrincipal(bob);
  const postId = await actor.uploadPost("Recommended", "c", new Uint8Array([15]), "rec.mp3");
  actor.setPrincipal(alice);
  await actor.followUser(bob);
  const recommendations = await actor.getRecommendations(5n);
  expect(recommendations.map((p) => p.id)).toContain(postId);
});
