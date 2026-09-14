import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Messages from "./pages/Messages";
import MessagesConversation from "./pages/MessagesConversation";
import Playlists from "./pages/Playlists";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";

const rootRoute = createRootRoute({
  component: Layout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: Upload,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$principal",
  component: Profile,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: Messages,
});

const messagesConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages/$conversationId",
  component: MessagesConversation,
});

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/post/$postId",
  component: PostDetail,
});

const playlistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlists",
  component: Playlists,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  uploadRoute,
  profileRoute,
  messagesRoute,
  messagesConversationRoute,
  postDetailRoute,
  playlistsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
