import { describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import { store } from "../../app/store";
import FinancePage from "./FinancePage";

vi.mock("../../api/finance", async () => {
  const actual = await vi.importActual<typeof import("../../api/finance")>(
    "../../api/finance",
  );
  return {
    ...actual,
    getFeeStats: vi.fn(async () => ({ due: 1000, paid: 5000 })),
    getCollectionSummary: vi.fn(async () => ({ collected: 8000, refunded: 500, net: 7500 })),
    getFeeDefaulters: vi.fn(async () => []),
    calculateDues: vi.fn(async () => ({ updated: 0 })),
  };
});

describe("FinancePage", () => {
  it("renders invoice placeholder tab", async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/finance?tab=invoices"]}>
          <FinancePage />
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByRole("heading", { name: "Finance" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: "Invoices" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(
      await screen.findByText(/Invoices are planned but not implemented/i),
    ).toBeInTheDocument();
  });
});
