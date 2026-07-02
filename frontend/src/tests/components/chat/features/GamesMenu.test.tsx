import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GamesMenu } from "../../../../components/chat/features/GamesMenu";

describe("GamesMenu custom games", () => {
  it("submits a custom this-or-that payload", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    const onClose = vi.fn();
    render(<GamesMenu onTrigger={onTrigger} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Własne" }));
    await user.type(
      screen.getByPlaceholderText("Pytanie (np. Kawa czy herbata?)"),
      "Kot czy pies?"
    );
    await user.type(screen.getByPlaceholderText("Opcja A"), "Kot");
    await user.type(screen.getByPlaceholderText("Opcja B"), "Pies");
    await user.click(screen.getByRole("button", { name: "Wyślij to czy to" }));

    expect(onTrigger).toHaveBeenCalledWith("this_or_that", {
      question: "Kot czy pies?",
      options: ["Kot", "Pies"],
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("submits a custom truth-or-dare payload", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    render(<GamesMenu onTrigger={onTrigger} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Własne" }));
    await user.click(screen.getByRole("button", { name: "Prawda/Wyzwanie" }));
    await user.click(screen.getByRole("button", { name: "Wyzwanie" }));
    await user.type(screen.getByPlaceholderText("Wpisz wyzwanie"), "Zaśpiewaj refren");
    await user.click(screen.getByRole("button", { name: "Wyślij wyzwanie" }));

    expect(onTrigger).toHaveBeenCalledWith("truth_or_dare", {
      choice: "dare",
      text: "Zaśpiewaj refren",
    });
  });

  it("keeps the menu open and shows validation for an empty custom question", async () => {
    const user = userEvent.setup();
    const onTrigger = vi.fn();
    const onClose = vi.fn();
    render(<GamesMenu onTrigger={onTrigger} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Własne" }));
    await user.click(screen.getByRole("button", { name: "Wyślij to czy to" }));

    expect(screen.getByText("Wpisz pytanie!")).toBeInTheDocument();
    expect(onTrigger).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
