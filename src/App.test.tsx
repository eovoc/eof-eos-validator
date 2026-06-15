import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders heading and validate button", () => {
  render(<App />);
  expect(screen.getByText(/json validator/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /validate/i })).toBeDisabled();
});
