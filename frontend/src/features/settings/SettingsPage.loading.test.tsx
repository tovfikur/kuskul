import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { api } from "../../api/client";
import SettingsPage from "./SettingsPage";

vi.mock("../../api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("../../app/toast", () => ({ showToast: vi.fn() }));

it("loads the profile and SMS configuration from one collection request", async () => {
  vi.mocked(api.get).mockResolvedValue({ data: [
    { key: "school.profile.name", value: "Example School" },
    { key: "email_sms.settings", value: JSON.stringify({ sms_sender_id: "EXAMPLE" }) },
  ] });
  render(<SettingsPage />);
  expect(await screen.findByLabelText("School Name")).toHaveValue("Example School");
  fireEvent.click(screen.getByRole("tab", { name: "Email & SMS" }));
  expect(screen.getByLabelText("SMS Sender ID")).toHaveValue("EXAMPLE");
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith("/settings", { timeout: 15000 });
});
