import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import { store } from "../app/store";
import LandingPage from "./LandingPage";

test("renders landing content for anonymous", () => {
  localStorage.clear();
  render(
    <Provider store={store}>
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    </Provider>
  );

  expect(
    screen.getByRole("heading", { name: /multi-tenant school operations/i })
  ).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /sign in/i }).length).toBeGreaterThan(0);
  expect(screen.getByText(/everything schools need/i)).toBeInTheDocument();
});
