import { waitFor } from "@testing-library/dom";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  useMediaUpload,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
} from "../../../hooks/media/useMediaUpload";

function fileOfSize(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

function pickEvent(file: File | undefined) {
  const input = document.createElement("input");
  input.type = "file";
  Object.defineProperty(input, "files", {
    value: file ? [file] : [],
    writable: false,
  });
  return { target: input } as unknown as React.ChangeEvent<HTMLInputElement>;
}

/** Fires `reader.onerror`, satisfying the `ProgressEvent<FileReader>` type FileReader expects. */
function fireReaderError(reader: FileReader) {
  reader.onerror?.(new ProgressEvent("error") as unknown as ProgressEvent<FileReader>);
}

/** Fires `reader.onload`, satisfying the `ProgressEvent<FileReader>` type FileReader expects. */
function fireReaderLoad(reader: FileReader) {
  reader.onload?.(new ProgressEvent("load") as unknown as ProgressEvent<FileReader>);
}

describe("useMediaUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("alert", vi.fn());
  });

  it("starts with no media selected", () => {
    const { result } = renderHook(() => useMediaUpload());
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.selectedVideo).toBeNull();
    expect(result.current.viewOnceChecked).toBe(false);
  });

  it("accepts a valid image and converts it to a data URL", async () => {
    const { result } = renderHook(() => useMediaUpload());
    const file = fileOfSize("photo.png", "image/png", 1024);

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(file));
    });

    await waitFor(() => expect(result.current.selectedImage).toMatch(/^data:image\/png;base64,/));
    expect(result.current.selectedVideo).toBeNull();
  });

  it("clears any selected video when a new image is picked", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.handleVideoPicked(pickEvent(fileOfSize("clip.mp4", "video/mp4", 1024)));
    });
    await waitFor(() => expect(result.current.selectedVideo).not.toBeNull());

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(fileOfSize("photo.png", "image/png", 1024)));
    });
    await waitFor(() => expect(result.current.selectedImage).not.toBeNull());
    expect(result.current.selectedVideo).toBeNull();
  });

  it("rejects a non-image file for the image picker", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.handleImagePicked(
        pickEvent(fileOfSize("doc.pdf", "application/pdf", 1024))
      );
    });
    expect(result.current.selectedImage).toBeNull();
  });

  it("rejects an image exceeding MAX_IMAGE_SIZE_BYTES and alerts the user", async () => {
    const { result } = renderHook(() => useMediaUpload());
    const oversized = fileOfSize("huge.png", "image/png", MAX_IMAGE_SIZE_BYTES + 1);

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(oversized));
    });

    expect(result.current.selectedImage).toBeNull();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("za duże"));
  });

  it("rejects a video exceeding MAX_VIDEO_SIZE_BYTES and alerts the user", async () => {
    const { result } = renderHook(() => useMediaUpload());
    const oversized = fileOfSize("huge.mp4", "video/mp4", MAX_VIDEO_SIZE_BYTES + 1);

    await act(async () => {
      await result.current.handleVideoPicked(pickEvent(oversized));
    });

    expect(result.current.selectedVideo).toBeNull();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("za duże"));
  });

  it("rejects a non-video file for the video picker", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.handleVideoPicked(
        pickEvent(fileOfSize("doc.pdf", "application/pdf", 1024))
      );
    });
    expect(result.current.selectedVideo).toBeNull();
  });

  it("silently ignores a FileReader failure while picking an image", async () => {
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      fireReaderError(this);
    };
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(fileOfSize("photo.png", "image/png", 1024)));
    });

    expect(result.current.selectedImage).toBeNull();
    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });

  it("silently ignores a FileReader failure while picking a video", async () => {
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      fireReaderError(this);
    };
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.handleVideoPicked(pickEvent(fileOfSize("clip.mp4", "video/mp4", 1024)));
    });

    expect(result.current.selectedVideo).toBeNull();
    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });

  it("falls back to an empty string when FileReader resolves with no result (image)", async () => {
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      Object.defineProperty(this, "result", { value: null, configurable: true });
      fireReaderLoad(this);
    };
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(fileOfSize("photo.png", "image/png", 1024)));
    });

    expect(result.current.selectedImage).toBe("");
    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });

  it("falls back to an empty string when FileReader resolves with no result (video)", async () => {
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      Object.defineProperty(this, "result", { value: null, configurable: true });
      fireReaderLoad(this);
    };
    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.handleVideoPicked(pickEvent(fileOfSize("clip.mp4", "video/mp4", 1024)));
    });

    expect(result.current.selectedVideo).toBe("");
    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });

  it("does nothing when no file is selected", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.handleImagePicked(pickEvent(undefined));
    });
    expect(result.current.selectedImage).toBeNull();
  });

  it("invokes onMediaPicked after a successful image pick", async () => {
    const onMediaPicked = vi.fn();
    const { result } = renderHook(() => useMediaUpload(onMediaPicked));

    await act(async () => {
      await result.current.handleImagePicked(pickEvent(fileOfSize("photo.png", "image/png", 1024)));
    });

    await waitFor(() => expect(onMediaPicked).toHaveBeenCalledTimes(1));
  });

  it("invokes onMediaPicked after a successful video pick", async () => {
    const onMediaPicked = vi.fn();
    const { result } = renderHook(() => useMediaUpload(onMediaPicked));

    await act(async () => {
      await result.current.handleVideoPicked(pickEvent(fileOfSize("clip.mp4", "video/mp4", 1024)));
    });

    await waitFor(() => expect(onMediaPicked).toHaveBeenCalledTimes(1));
  });

  it("clearSelectedMedia resets image, video and the view-once flag", async () => {
    const { result } = renderHook(() => useMediaUpload());
    await act(async () => {
      await result.current.handleImagePicked(pickEvent(fileOfSize("photo.png", "image/png", 1024)));
    });
    await waitFor(() => expect(result.current.selectedImage).not.toBeNull());
    act(() => result.current.setViewOnceChecked(true));

    act(() => result.current.clearSelectedMedia());

    expect(result.current.selectedImage).toBeNull();
    expect(result.current.selectedVideo).toBeNull();
    expect(result.current.viewOnceChecked).toBe(false);
  });
});
