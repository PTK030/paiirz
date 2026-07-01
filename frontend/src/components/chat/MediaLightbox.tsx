import { motion, AnimatePresence } from "framer-motion";

import type { UseMediaUploadReturn } from "../../hooks/useMediaUpload";

import { CustomVideoPlayer } from "./CustomVideoPlayer";

export interface MediaLightboxProps {
  media: UseMediaUploadReturn;
}

/**
 * @description Full-screen preview of the selected image/video before
 * sending. Purely presentational - renders nothing unless
 * `media.previewLightboxOpen` is true and media is selected.
 */
export function MediaLightbox({ media }: MediaLightboxProps) {
  return (
    <AnimatePresence>
      {media.previewLightboxOpen && (media.selectedImage || media.selectedVideo) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => media.setPreviewLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {media.selectedImage ? (
              <>
                <img
                  src={media.selectedImage}
                  alt="Podgląd zdjęcia"
                  className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/50 select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                <button
                  onClick={() => media.setPreviewLightboxOpen(false)}
                  className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <CustomVideoPlayer src={media.selectedVideo!} mode="lightbox" />
                <button
                  onClick={() => media.setPreviewLightboxOpen(false)}
                  className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                >
                  ✕
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
