import { useState, useRef, useCallback } from "react";
import type React from "react";

// ─── Media upload limits ──────────────────────────────────────────────────────
// Media is base64-encoded and sent over the socket as a single message, so an
// unbounded file could stall the connection or exhaust memory on both peers.

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export interface UseMediaUploadReturn {
  selectedImage: string | null;
  setSelectedImage: React.Dispatch<React.SetStateAction<string | null>>;
  selectedVideo: string | null;
  setSelectedVideo: React.Dispatch<React.SetStateAction<string | null>>;
  viewOnceChecked: boolean;
  setViewOnceChecked: React.Dispatch<React.SetStateAction<boolean>>;
  previewLightboxOpen: boolean;
  setPreviewLightboxOpen: React.Dispatch<React.SetStateAction<boolean>>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  handleImagePicked: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleVideoPicked: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Clear any selected image/video and reset the "view once" checkbox. */
  clearSelectedMedia: () => void;
}

/**
 * @description Manages picking, reading, and validating image/video files
 * before they're handed off to the caller for sending. Rejects files that
 * are the wrong MIME type or exceed the size limit, converting accepted
 * files to base64 data URIs (the wire format used throughout the app).
 *
 * @param onMediaPicked - optional callback fired after a file is
 *   successfully picked (e.g. to close the "more actions" menu)
 *
 * @example
 * const media = useMediaUpload(() => setActionsMenuOpen(false));
 * <input ref={media.imageInputRef} type="file" onChange={media.handleImagePicked} />
 */
export function useMediaUpload(onMediaPicked?: () => void): UseMediaUploadReturn {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [viewOnceChecked, setViewOnceChecked] = useState(false);
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const readAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        e.target.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        alert(`Zdjęcie jest za duże (max ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB).`);
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        setSelectedImage(dataUrl);
        setSelectedVideo(null);
        onMediaPicked?.();
      } catch {
        // ignore invalid file read
      } finally {
        e.target.value = "";
      }
    },
    [readAsDataUrl, onMediaPicked]
  );

  const handleVideoPicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("video/")) {
        e.target.value = "";
        return;
      }
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        alert(`Wideo jest za duże (max ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB).`);
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        setSelectedVideo(dataUrl);
        setSelectedImage(null);
        onMediaPicked?.();
      } catch {
        // ignore invalid file read
      } finally {
        e.target.value = "";
      }
    },
    [readAsDataUrl, onMediaPicked]
  );

  const clearSelectedMedia = useCallback(() => {
    setSelectedImage(null);
    setSelectedVideo(null);
    setViewOnceChecked(false);
  }, []);

  return {
    selectedImage,
    setSelectedImage,
    selectedVideo,
    setSelectedVideo,
    viewOnceChecked,
    setViewOnceChecked,
    previewLightboxOpen,
    setPreviewLightboxOpen,
    imageInputRef,
    videoInputRef,
    handleImagePicked,
    handleVideoPicked,
    clearSelectedMedia,
  };
}
