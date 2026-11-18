/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SampleCard } from "./sample-card";

afterEach(() => cleanup());

describe("sample card", () => {
  it("labels the sample and does not offer a join or create action", () => {
    render(<SampleCard />);
    expect(screen.getByText("Sample")).toBeTruthy();
    expect(screen.getByText(/not saved as your bond/i)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
