import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IcebreakerCard } from "../../../../components/chat/features/IcebreakerCard";

describe("IcebreakerCard custom preview", () => {
  it("shows custom this-or-that content while waiting for acceptance", () => {
    render(
      <IcebreakerCard
        msgId="game-1"
        mySid="creator"
        onAction={vi.fn()}
        icebreaker={{
          type: "this_or_that",
          question: "Kot czy pies?",
          options: ["Kot", "Pies"],
          votes: {},
          status: "proposed",
          accepted_users: ["creator"],
          is_custom: true,
        }}
      />
    );

    expect(screen.getByText("Własna treść")).toBeInTheDocument();
    expect(screen.getByText("Kot czy pies?")).toBeInTheDocument();
    expect(screen.getByText("Kot")).toBeInTheDocument();
    expect(screen.getByText("Pies")).toBeInTheDocument();
  });

  it("shows a custom truth-or-dare prompt to the invited player", () => {
    render(
      <IcebreakerCard
        msgId="game-2"
        mySid="partner"
        onAction={vi.fn()}
        icebreaker={{
          type: "truth_or_dare",
          question: "Wyzwanie",
          result: "Zaśpiewaj refren",
          votes: { partner: "dare" },
          status: "proposed",
          accepted_users: ["creator"],
          is_custom: true,
        }}
      />
    );

    expect(screen.getByText("Zaśpiewaj refren")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dołącz" })).toBeInTheDocument();
  });
});
