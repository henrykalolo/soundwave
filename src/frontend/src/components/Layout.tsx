import { Outlet } from "@tanstack/react-router";
import AudioPlayer from "./AudioPlayer";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <AudioPlayer />
    </div>
  );
}
