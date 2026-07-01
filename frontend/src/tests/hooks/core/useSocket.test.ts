import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useSocket } from "../../hooks/useSocket";

const disconnect = vi.fn();
const io = vi.fn(() => ({ disconnect }));

vi.mock("socket.io-client", () => ({
  default: (url: string) => io(url),
}));

describe("useSocket", () => {
  it("returns null until the connection is initiated", () => {
    const { result } = renderHook(() => useSocket("http://localhost:5000"));
    expect(result.current).not.toBeNull();
  });

  it("connects to the given URL on mount", async () => {
    renderHook(() => useSocket("http://localhost:5000"));
    await waitFor(() => expect(io).toHaveBeenCalledWith("http://localhost:5000"));
  });

  it("disconnects the socket on unmount", () => {
    const { unmount } = renderHook(() => useSocket("http://localhost:5000"));
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects with a new socket when the URL changes", async () => {
    const { rerender } = renderHook(({ url }) => useSocket(url), {
      initialProps: { url: "http://localhost:5000" },
    });
    await waitFor(() => expect(io).toHaveBeenCalledTimes(1));

    rerender({ url: "http://localhost:6000" });
    await waitFor(() => expect(io).toHaveBeenCalledTimes(2));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenLastCalledWith("http://localhost:6000");
  });
});
