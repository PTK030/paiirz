import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface UseChatUIReturn {
  gamesMenuOpen: boolean;
  setGamesMenuOpen: Dispatch<SetStateAction<boolean>>;
  contactMenuOpen: boolean;
  setContactMenuOpen: Dispatch<SetStateAction<boolean>>;
  actionsMenuOpen: boolean;
  setActionsMenuOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * @description Manages the open/closed state of the chat page's dropdown
 * menus (games, contact exchange, actions) and closes any open menu when the
 * user clicks outside of it. Menu containers are matched by CSS class name
 * (`.games-menu-container`, `.contact-exchange-container`,
 * `.actions-menu-container`) since the menus are rendered in different parts
 * of the component tree.
 *
 * @example
 * const { gamesMenuOpen, setGamesMenuOpen } = useChatUI();
 */
export function useChatUI(): UseChatUIReturn {
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contactMenuOpen && !target.closest(".contact-exchange-container"))
        setContactMenuOpen(false);
      // GamesMenu is mounted inside the actions-menu root. The click that
      // opens it therefore belongs to the same interaction boundary and must
      // not immediately be interpreted as an outside click.
      if (
        gamesMenuOpen &&
        !target.closest(".games-menu-container") &&
        !target.closest(".actions-menu-container")
      )
        setGamesMenuOpen(false);
      if (actionsMenuOpen && !target.closest(".actions-menu-container")) setActionsMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contactMenuOpen, gamesMenuOpen, actionsMenuOpen]);

  return {
    gamesMenuOpen,
    setGamesMenuOpen,
    contactMenuOpen,
    setContactMenuOpen,
    actionsMenuOpen,
    setActionsMenuOpen,
  };
}
