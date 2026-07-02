import { motion, AnimatePresence } from "framer-motion";

import type { UseMediaUploadReturn } from "../../../hooks/media/useMediaUpload";

export interface MediaPreviewPanelProps {
  media: UseMediaUploadReturn;
}

/**
 * @description Floating preview of a selected image/video before sending,
 * with a "view once" toggle and a remove button. Purely presentational -
 * renders nothing when no media is selected.
 */
export function MediaPreviewPanel({ media }: MediaPreviewPanelProps) {
  return (
    <AnimatePresence>
      {(media.selectedImage || media.selectedVideo) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{ x: "-50%" }}
          className="absolute bottom-[90px] sm:bottom-[100px] left-1/2 w-[calc(100%-2rem)] sm:w-auto sm:min-w-[400px] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl p-4 flex gap-4 items-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-xl z-50 max-w-lg"
        >
          <div
            onClick={() => media.setPreviewLightboxOpen(true)}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-zinc-700/50"
          >
            {media.selectedImage ? (
              <img
                src={media.selectedImage}
                alt="Podgląd"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <video src={media.selectedVideo!} className="w-full h-full object-cover" muted />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-white tracking-widest bg-black/50 px-2 py-1 rounded">
                PODGLĄD
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                media.setSelectedImage(null);
                media.setSelectedVideo(null);
              }}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-red-500/90 rounded-full transition-colors z-10"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2.5 flex-grow">
            <span className="text-sm font-bold text-zinc-100">
              {media.selectedImage ? "Zdjęcie gotowe do wysłania" : "Wideo gotowe do wysłania"}
            </span>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={media.viewOnceChecked}
                  onChange={(e) => media.setViewOnceChecked(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-zinc-600 rounded bg-zinc-900/50 checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                />
                <svg
                  className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                  viewBox="0 0 14 10"
                  fill="none"
                >
                  <path
                    d="M1 5L4.5 8.5L13 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Wyślij jako &quot;Wyświetl raz&quot;
              </span>
            </label>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
