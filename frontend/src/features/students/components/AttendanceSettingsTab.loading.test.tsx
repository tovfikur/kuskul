import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { api } from "../../../api/client";
import AttendanceSettingsTab from "./AttendanceSettingsTab";

vi.mock("../../../api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("../../../app/toast", () => ({ showToast: vi.fn() }));

it("shows attendance controls before loading students and searches only on demand", async () => {
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === "/attendance/hikvision/devices") return { data: [{ id: "gate", name: "Gate", external_device_id: "G-42", timezone: "Asia/Dhaka", active: true, credentials_configured: false }] };
    if (url === "/settings/attendance.settings") return { data: { value: "" } };
    if (url === "/students") return { data: { items: [{ id: "student", first_name: "Amina", last_name: "", admission_no: "42" }] } };
    return { data: [] };
  });
  render(<AttendanceSettingsTab />);
  expect(await screen.findByRole("button", { name: "Test Connection" })).toBeEnabled();
  expect(screen.getAllByText("Gate")).toHaveLength(2);
  expect(screen.getByText("G-42")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Search active students" })).toBeInTheDocument();
  expect(vi.mocked(api.get).mock.calls.some(([url]) => url === "/students")).toBe(false);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Search active students" }));
  expect(await screen.findByRole("option", { name: "Amina (42)" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Search active students" }), { target: { value: "Amina" } });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/students", expect.objectContaining({
    params: { limit: 25, status: "active", search: "Amina" },
  })));
});
