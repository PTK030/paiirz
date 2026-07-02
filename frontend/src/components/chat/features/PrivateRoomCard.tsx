import { motion, AnimatePresence } from "framer-motion";

import { PRIVATE_ROOM_CODE_LENGTH, PRIVATE_ROOM_CODE_MIN_LENGTH } from "../../../constants";
import type { UsePrivateRoomReturn } from "../../../hooks/core/usePrivateRoom";

export interface PrivateRoomCardProps {
  privateRoom: UsePrivateRoomReturn;
}

/**
 * @description Setup-screen card for creating or joining a private,
 * code-based room, including its privacy options (screenshot detection,
 * tab-leave notifications). All state and socket interaction live in
 * `usePrivateRoom` - this component only renders it.
 */
export function PrivateRoomCard({ privateRoom }: PrivateRoomCardProps) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Prywatny pokój</h3>
          <p className="text-xs text-zinc-500">Zaproś konkretną osobę kodem</p>
        </div>
      </div>

      {privateRoom.privateRoomError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {privateRoom.privateRoomError}
        </div>
      )}

      <div className="flex gap-2">
        {(["create", "join"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() =>
              privateRoom.setPrivateRoomMode(privateRoom.privateRoomMode === mode ? null : mode)
            }
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              privateRoom.privateRoomMode === mode
                ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                : "bg-zinc-900/50 text-zinc-400 border-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            {mode === "create" ? "Stwórz pokój" : "Dołącz z kodem"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {privateRoom.privateRoomMode === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-2 pb-1">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privateRoom.noScreenshots}
                    onChange={(e) => privateRoom.setNoScreenshots(e.target.checked)}
                    className="w-4 h-4 accent-violet-500 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300">
                    Wykrywaj screenshoty i powiadamiaj mnie
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privateRoom.notifyOnTabLeave}
                    onChange={(e) => privateRoom.setNotifyOnTabLeave(e.target.checked)}
                    className="w-4 h-4 accent-violet-500 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300">
                    Powiadamiaj gdy rozmówca opuści kartę
                  </span>
                </label>
              </div>
              <button
                onClick={privateRoom.createPrivateRoom}
                className="w-full py-3 text-sm font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Wygeneruj link i czekaj
              </button>
            </div>
          </motion.div>
        )}

        {privateRoom.privateRoomMode === "join" && (
          <motion.div
            key="join"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pt-2 pb-1">
              <input
                type="text"
                value={privateRoom.privateRoomInputCode}
                onChange={(e) =>
                  privateRoom.setPrivateRoomInputCode(
                    e.target.value.toUpperCase().slice(0, PRIVATE_ROOM_CODE_LENGTH)
                  )
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && privateRoom.joinPrivateRoom(privateRoom.privateRoomInputCode)
                }
                placeholder="Kod pokoju (np. A3XK9F)"
                maxLength={PRIVATE_ROOM_CODE_LENGTH}
                className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-mono tracking-widest uppercase"
              />
              <button
                onClick={() => privateRoom.joinPrivateRoom(privateRoom.privateRoomInputCode)}
                disabled={privateRoom.privateRoomInputCode.length < PRIVATE_ROOM_CODE_MIN_LENGTH}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Dołącz
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
