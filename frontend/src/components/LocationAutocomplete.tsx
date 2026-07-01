/**
 * LocationAutocomplete
 *
 * Controlled input with a suggestions dropdown, following the OLX / Otomoto
 * location-search UX pattern:
 *
 *  - Debounced search kicks in after 2 characters (handled by the hook)
 *  - Dropdown shows city name + voivodeship as subtitle
 *  - Keyboard: ↑ ↓ navigate, Enter confirms, Escape dismisses
 *  - Selecting a suggestion populates coordinates for matchmaking
 *  - Clear button resets both the text and the stored coordinates
 *  - Fully accessible: role="combobox", role="listbox", aria-activedescendant
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useLocationAutocomplete,
  type LocationSuggestion,
} from "../hooks/useLocationAutocomplete";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface LocationAutocompleteProps {
  /** Controlled text value shown in the input. */
  value: string;
  /** Called on every keystroke with the raw text. */
  onChange: (value: string) => void;
  /** Called when the user confirms a suggestion (click or Enter). */
  onSelect: (suggestion: LocationSuggestion) => void;
  /** Called when the clear (×) button is clicked. */
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = "Wpisz miasto lub użyj GPS",
  className = "",
}) => {
  /**
   * searchQuery drives the hook - kept separate from `value` so that
   * selecting a suggestion (which updates `value`) does NOT re-trigger search.
   */
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { suggestions, isLoading } = useLocationAutocomplete(searchQuery);
  const showDropdown = isOpen && (isLoading || suggestions.length > 0);

  // ── Input handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);
    setSearchQuery(text);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      onChange(suggestion.name);
      setSearchQuery(""); // stop further search requests
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect(suggestion);
    },
    [onChange, onSelect],
  );

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    onClear();
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // ── Close on outside click ─────────────────────────────────────────────────

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ── Scroll active item into view ───────────────────────────────────────────

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const listboxId = "location-listbox";
  const activeDescendant =
    activeIndex >= 0 ? `loc-opt-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-owns={listboxId}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          className="w-full appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus-visible:ring-2 focus:ring-white/15 focus-visible:ring-white/15 focus:ring-offset-0 focus:border-zinc-700/90 transition-colors duration-200 pr-9 [-webkit-tap-highlight-color:transparent]"
        />

        {/* Right adornment: spinner while loading, ×-button when there is text */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div
              aria-label="Wyszukiwanie..."
              className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
            />
          ) : value ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Wyczyść lokalizację"
              className="pointer-events-auto text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-full hover:bg-zinc-700/50 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Sugestie lokalizacji"
          className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
        >
          {/* Skeleton row while the first fetch is in progress */}
          {isLoading && suggestions.length === 0 && (
            <li
              className="px-4 py-3 text-xs text-zinc-500 flex items-center gap-2"
              aria-disabled="true"
            >
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin shrink-0" />
              Wyszukiwanie miast…
            </li>
          )}

          {suggestions.map((suggestion, i) => (
            <li
              key={suggestion.id}
              id={`loc-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              /* Use pointerdown instead of click so the dropdown doesn't close
                 from the input's blur event before the click registers. */
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm select-none ${
                i === activeIndex
                  ? "bg-indigo-500/20 text-white"
                  : "text-zinc-300 hover:bg-zinc-800/80"
              }`}
            >
              {/* Map-pin icon (matches the GPS button) */}
              <svg
                className="w-3.5 h-3.5 shrink-0 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{suggestion.name}</span>
                {suggestion.state && (
                  <span className="text-[10px] text-zinc-500 truncate">
                    {suggestion.state.toLowerCase()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
