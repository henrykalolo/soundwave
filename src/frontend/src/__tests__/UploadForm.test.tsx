import UploadForm from "@/components/UploadForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAudioFile } from "./fixtures/audio";

const uploadPost = vi.fn();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: { uploadPost }, isFetching: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: () => ({
      withUploadProgress: () => ({ mockBlob: true }),
    }),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector("#audio-file") as HTMLInputElement;
}

function makeFile(name = "track.mp3", type = "audio/mpeg"): File {
  return new File(["audio-bytes"], name, { type });
}

describe("UploadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  it("disables publish until a file and title are provided", () => {
    renderWithQuery(<UploadForm />);
    const publish = screen.getByRole("button", { name: "Publish track" });
    expect(publish).toBeDisabled();
  });

  it("shows a preview with the selected file name and size", async () => {
    const user = userEvent.setup();
    const { container } = renderWithQuery(<UploadForm />);
    const input = getFileInput(container);
    await user.upload(input, makeAudioFile());
    expect(screen.getByText("fixture.wav")).toBeInTheDocument();
    expect(screen.getByText(/audio\/wav/)).toBeInTheDocument();
  });

  it("rejects a non-audio file with a clear error message", () => {
    const { container } = renderWithQuery(<UploadForm />);
    const input = getFileInput(container);
    // `userEvent.upload` respects the input's `accept="audio/*"` and silently
    // drops a non-matching file before it reaches the change handler, so the
    // rejection branch would never run. Use `fireEvent.change` to deliver the
    // non-audio file directly and exercise the validation path.
    fireEvent.change(input, {
      target: { files: [makeFile("notes.txt", "text/plain")] },
    });
    expect(
      screen.getByText(
        "That file isn't audio. Please choose an audio file (MP3, WAV, M4A, etc.).",
      ),
    ).toBeInTheDocument();
    // The rejected file is not accepted, so publish stays disabled.
    expect(
      screen.getByRole("button", { name: "Publish track" }),
    ).toBeDisabled();
  });

  it("accepts a real audio fixture file", async () => {
    const user = userEvent.setup();
    const { container } = renderWithQuery(<UploadForm />);
    const input = getFileInput(container);
    await user.upload(input, makeAudioFile());
    expect(screen.getByText("fixture.wav")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Track title"), "Midnight Drive");
    expect(screen.getByRole("button", { name: "Publish track" })).toBeEnabled();
  });

  it("publishes the track with title, caption, and file", async () => {
    uploadPost.mockResolvedValue(0n);
    const user = userEvent.setup();
    const { container } = renderWithQuery(<UploadForm />);
    const input = getFileInput(container);
    await user.upload(input, makeFile());
    await user.type(screen.getByLabelText("Track title"), "Midnight Drive");
    await user.type(screen.getByLabelText("Caption"), "a late-night beat");
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => {
      expect(uploadPost).toHaveBeenCalledWith(
        "Midnight Drive",
        "a late-night beat",
        expect.objectContaining({ mockBlob: true }),
        "track.mp3",
      );
    });
    expect(await screen.findByText("Your track is live!")).toBeInTheDocument();
  });

  it("shows an error message when the upload fails", async () => {
    uploadPost.mockRejectedValue(new Error("Upload failed. Please try again."));
    const user = userEvent.setup();
    const { container } = renderWithQuery(<UploadForm />);
    const input = getFileInput(container);
    await user.upload(input, makeFile());
    await user.type(screen.getByLabelText("Track title"), "Midnight Drive");
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(
      await screen.findByText("Upload failed. Please try again."),
    ).toBeInTheDocument();
  });
});
