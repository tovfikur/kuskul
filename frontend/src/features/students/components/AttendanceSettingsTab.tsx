import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Fingerprint, PlayArrow, Save, Sms, Sync } from "@mui/icons-material";

import { api } from "../../../api/client";
import { showToast } from "../../../app/toast";
import { type Student } from "../../../api/people";

type AttendanceSettings = {
  school_start_time: string;
  attendance_end_time: string;
  sync_interval_minutes: number;
  attendance_cutoff_time: string;
  late_grace_minutes: number;
  send_late_sms: boolean;
  send_absent_sms: boolean;
  late_sms_template: string;
  absent_sms_template: string;
  ai_sms_writer_enabled: boolean;
  ai_sms_language: "auto" | "en" | "bn";
  ai_sms_bangla_enabled: boolean;
  ai_sms_tone: "friendly" | "formal" | "concise";
  ai_sms_max_parts: number;
  absent_sms_first_days: number;
  absent_sms_return_summary: boolean;
  absent_sms_mass_absence_threshold: number;
  absent_sms_mass_absence_min_students: number;
  auto_mark_absent: boolean;
  exclude_holidays_from_absence: boolean;
  weekly_holidays: number[];
};

type HikvisionDevice = {
  id: string;
  name: string;
  external_device_id: string | null;
  area_domain: string | null;
  timezone: string;
  late_after: string | null;
  active: boolean;
  credentials_configured: boolean;
  last_sync_at: string | null;
};

type DeviceForm = {
  id: string;
  name: string;
  external_device_id: string;
  app_key: string;
  secret_key: string;
  area_domain: string;
  timezone: string;
  active: boolean;
};

type Credential = {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  person_code: string;
  active: boolean;
};

const defaults: AttendanceSettings = {
  school_start_time: "08:00",
  attendance_end_time: "17:00",
  sync_interval_minutes: 10,
  attendance_cutoff_time: "10:00",
  late_grace_minutes: 0,
  send_late_sms: false,
  send_absent_sms: false,
  late_sms_template: "Dear Guardian, {{student_name}} arrived late at {{time}} on {{date}}.",
  absent_sms_template: "Dear Guardian, {{student_name}} was absent on {{date}}.",
  ai_sms_writer_enabled: true,
  ai_sms_language: "auto",
  ai_sms_bangla_enabled: false,
  ai_sms_tone: "friendly",
  ai_sms_max_parts: 1,
  absent_sms_first_days: 3,
  absent_sms_return_summary: true,
  absent_sms_mass_absence_threshold: 60,
  absent_sms_mass_absence_min_students: 10,
  auto_mark_absent: false,
  exclude_holidays_from_absence: true,
  weekly_holidays: [4],
};

const emptyDevice: DeviceForm = {
  id: "",
  name: "Hikvision Attendance Device",
  external_device_id: "",
  app_key: "",
  secret_key: "",
  area_domain: "https://isgp-team.hikcentralconnect.com",
  timezone: "Asia/Dhaka",
  active: true,
};

const weekdayOptions = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

function calculateLateAfter(start: string, graceMinutes: number) {
  const [hours, minutes] = start.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const total = (hours * 60 + minutes + Math.max(0, graceMinutes)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function attendanceDateKey(timezone = "Asia/Dhaka", daysAgo = 0) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }
}

function formatSyncTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AttendanceSettingsTab() {
  const [settings, setSettings] = useState<AttendanceSettings>(defaults);
  const [devices, setDevices] = useState<HikvisionDevice[]>([]);
  const [selected, setSelected] = useState<HikvisionDevice | null>(null);
  const [device, setDevice] = useState<DeviceForm>(emptyDevice);
  const [editingId, setEditingId] = useState(""); // "" none, "__new__" add form, else device id
  const [showInactive, setShowInactive] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingDevice, setSavingDevice] = useState(false);
  const [removing, setRemoving] = useState<HikvisionDevice | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [mappingStudentId, setMappingStudentId] = useState("");
  const [personCode, setPersonCode] = useState("");
  const [processingAbsences, setProcessingAbsences] = useState(false);
  const [importStart, setImportStart] = useState(() => attendanceDateKey());
  const [importEnd, setImportEnd] = useState(() => attendanceDateKey());
  const [importProgress, setImportProgress] = useState("");
  const stopImport = useRef(false);
  const selectedTimezone = selected?.timezone || "Asia/Dhaka";
  const importToday = attendanceDateKey(selectedTimezone);
  const earliestImport = attendanceDateKey(selectedTimezone, 29);
  useEffect(() => () => { stopImport.current = true; }, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const lateAfter = useMemo(
    () => calculateLateAfter(settings.school_start_time, settings.late_grace_minutes),
    [settings.late_grace_minutes, settings.school_start_time],
  );

  const visibleDevices = devices.filter((item) => showInactive || item.active);

  async function selectMappingDevice(item?: HikvisionDevice) {
    if (!item) {
      setSelected(null);
      setCredentials([]);
      return;
    }
    setSelected(item);
    try {
      const response = await api.get(`/attendance/hikvision/devices/${item.id}/credentials`);
      setCredentials(response.data);
    } catch {
      setCredentials([]);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [settingsResponse, deviceResponse] = await Promise.all([
        api.get("/settings/attendance.settings", { timeout: 15000 }),
        api.get("/attendance/hikvision/devices", { timeout: 15000 }),
      ]);
      if (settingsResponse.data.value?.trim()) {
        const raw: Record<string, unknown> = JSON.parse(settingsResponse.data.value);
        const loaded: AttendanceSettings = { ...defaults, ...raw, sync_interval_minutes: 10 };
        // Legacy settings stored a single weekday; migrate it in memory so the
        // multi-select and the saved value agree.
        if (!Array.isArray(raw.weekly_holidays) && typeof raw.weekly_holiday === "number") {
          loaded.weekly_holidays = [raw.weekly_holiday];
        }
        setSettings(loaded);
      }
      setDevices(deviceResponse.data);
      const stillSelected = deviceResponse.data.some((item: HikvisionDevice) => item.id === selected?.id);
      if (!stillSelected || !selected) {
        const firstActive = deviceResponse.data.find((item: HikvisionDevice) => item.active);
        await selectMappingDevice(firstActive || deviceResponse.data[0]);
      }
    } catch (error) {
      console.error("Failed to load attendance settings", error);
      showToast({ severity: "error", message: "Failed to load attendance settings." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!studentPickerOpen) return;
    const controller = new AbortController();
    setStudentsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get<{ items: Student[] }>("/students", {
          params: { limit: 25, status: "active", search: studentSearch.trim() || undefined },
          signal: controller.signal,
          timeout: 15000,
        });
        if (!controller.signal.aborted) setStudents(data.items);
      } catch {
        if (!controller.signal.aborted) {
          setStudents([]);
          showToast({ severity: "error", message: "Student search failed. Close and reopen the picker to retry." });
        }
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [studentPickerOpen, studentSearch]);

  function openAddDevice() {
    setDevice(emptyDevice);
    setEditingId("__new__");
  }

  function openEditDevice(item: HikvisionDevice) {
    setDevice({
      id: item.id,
      name: item.name,
      external_device_id: item.external_device_id || "",
      app_key: "",
      secret_key: "",
      area_domain: item.area_domain || "",
      timezone: item.timezone || "Asia/Dhaka",
      active: item.active,
    });
    setEditingId(item.id);
  }

  function changeSetting<K extends keyof AttendanceSettings>(key: K, value: AttendanceSettings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!settings.school_start_time || !settings.attendance_end_time || !settings.attendance_cutoff_time) {
      showToast({ severity: "error", message: "Set the school start, end, and attendance cutoff times." });
      return;
    }
    if (settings.attendance_cutoff_time <= settings.school_start_time) {
      showToast({ severity: "error", message: "Attendance cutoff time must be after the school start time." });
      return;
    }
    if (settings.attendance_end_time <= settings.school_start_time) {
      showToast({ severity: "error", message: "School end time must be after the school start time." });
      return;
    }
    setSaving(true);
    try {
      await api.put("/settings/attendance.settings", { value: JSON.stringify(settings) });
      await load();
      showToast({ severity: "success", message: "Attendance settings saved." });
    } catch (error) {
      console.error("Failed to save attendance settings", error);
      showToast({ severity: "error", message: "Attendance settings could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  async function saveDevice() {
    if (!device.name.trim()) {
      showToast({ severity: "error", message: "Set a device name." });
      return;
    }
    if (!lateAfter) {
      showToast({ severity: "error", message: "A valid school start time is required for device configuration." });
      return;
    }
    setSavingDevice(true);
    try {
      const data: Record<string, string | boolean | null> = {
        name: device.name.trim(),
        external_device_id: device.external_device_id.trim() || null,
        area_domain: device.area_domain.trim() || null,
        timezone: device.timezone,
        late_after: lateAfter || null,
        active: device.active,
      };
      // Blank secret fields mean "leave the existing secret unchanged".
      if (device.app_key.trim()) data.app_key = device.app_key.trim();
      if (device.secret_key.trim()) data.secret_key = device.secret_key.trim();
      const response = device.id
        ? await api.put(`/attendance/hikvision/devices/${device.id}`, data)
        : await api.post("/attendance/hikvision/devices", data);
      setEditingId("");
      setDevice(emptyDevice);
      await load();
      showToast({ severity: "success", message: response.data.id ? "Device updated." : "Device added." });
    } catch (error) {
      console.error("Failed to save device", error);
      showToast({ severity: "error", message: "The device could not be saved." });
    } finally {
      setSavingDevice(false);
    }
  }

  async function confirmRemoveDevice() {
    if (!removing) return;
    setSavingDevice(true);
    try {
      await api.put(`/attendance/hikvision/devices/${removing.id}`, { active: false });
      if (selected?.id === removing.id) await selectMappingDevice(undefined);
      await load();
      showToast({ severity: "success", message: "Device removed. It will no longer sync or mark student attendance." });
    } catch (error) {
      console.error("Failed to remove device", error);
      showToast({ severity: "error", message: "The device could not be removed." });
    } finally {
      setSavingDevice(false);
      setRemoving(null);
    }
  }

  async function restoreDevice(item: HikvisionDevice) {
    setSavingDevice(true);
    try {
      await api.put(`/attendance/hikvision/devices/${item.id}`, { active: true });
      await load();
      showToast({ severity: "success", message: "Device re-activated and syncing again." });
    } catch (error) {
      console.error("Failed to restore device", error);
      showToast({ severity: "error", message: "The device could not be restored." });
    } finally {
      setSavingDevice(false);
    }
  }

  async function mapCredential() {
    if (!selected?.id || !mappingStudentId || !personCode.trim()) {
      showToast({ severity: "error", message: "Select a device and student, then enter the Hikvision person code." });
      return;
    }
    try {
      await api.post(`/attendance/hikvision/devices/${selected.id}/credentials`, {
        student_id: mappingStudentId,
        person_code: personCode.trim(),
      });
      setPersonCode("");
      setMappingStudentId("");
      setSelectedStudent(null);
      await selectMappingDevice(selected);
      showToast({ severity: "success", message: "Student biometric ID mapped to this device." });
    } catch (error) {
      console.error("Failed to map credential", error);
      showToast({ severity: "error", message: "The biometric ID could not be mapped. It may already belong to another student." });
    }
  }

  async function testDeviceConnection(deviceId: string) {
    setTestingId(deviceId);
    try {
      const { data } = await api.post(`/attendance/hikvision/devices/${deviceId}/test-connection`, undefined, { timeout: 12000 });
      showToast({
        severity: data.usable ? "success" : "warning",
        message: data.usable
          ? `Connected to Hik-Connect. Read ${data.usable} usable sample punch(es) for this device. Attendance imports run every 10 minutes.`
          : data.sampled
            ? "Connected to Hik-Connect and read data, but this sample has no usable punches for the selected device. Check the device mapping."
            : "Connected to Hik-Connect. No punches were returned in the sample from the last two days; attendance data could not be confirmed.",
      });
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
      const timedOut = isAxiosError(error) && (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT");
      showToast({ severity: "error", message: timedOut
        ? "Connection test timed out. Hik-Connect is taking too long to respond; try again."
        : typeof detail === "string" && detail !== "Unexpected error"
          ? detail : "Connection test failed. Check the saved cloud credentials and server connection." });
    } finally {
      setTestingId(null);
    }
  }

  async function processAttendanceData() {
    if (!selected?.id) return;
    if (!importStart || !importEnd || importStart < earliestImport || importEnd > importToday || importStart > importEnd) {
      showToast({ severity: "error", message: "Choose a date range within the last 30 days." });
      return;
    }
    stopImport.current = false;
    setProcessingAbsences(true);
    setImportProgress("Fetching the first batch...");
    let page = 1;
    let cutoff: string | undefined;
    let previousPage: string | undefined;
    const totals = { pulled: 0, processed: 0, corrected_absent: 0, unmatched: 0, duplicate: 0, invalid: 0, skipped_device: 0, deferred: 0, ignored: 0 };
    let completed = false;
    try {
      while (!stopImport.current) {
        const { data } = await api.post(`/attendance/hikvision/devices/${selected.id}/sync-batch`, {
          start_date: importStart, end_date: importEnd, page_index: page, cutoff, previous_page: previousPage,
        }, { timeout: 30000 });
        for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += Number(data[key] || 0);
        setImportProgress(`${totals.pulled} punches checked · ${totals.processed + totals.corrected_absent} attendance records saved · ${totals.duplicate} duplicates · ${totals.unmatched} unmatched · ${totals.skipped_device} other-device punches · ${totals.deferred + totals.ignored} outside the date window or waiting · ${totals.invalid} invalid`);
        if (data.done) { completed = true; break; }
        if (!data.next_page || data.next_page <= page) throw new Error("Invalid batch continuation");
        page = data.next_page;
        cutoff = data.cutoff;
        previousPage = data.previous_page;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      showToast({
        severity: completed && !totals.invalid ? "success" : "warning",
        message: `${completed ? "Attendance import complete" : "Import stopped"}: ${totals.pulled} punches checked, ${totals.processed + totals.corrected_absent} attendance records saved, ${totals.unmatched} unmatched${totals.invalid ? `, ${totals.invalid} invalid punches` : ""}. Saved batches are kept.`,
      });
    } catch (error) {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
      showToast({ severity: "error", message: `${typeof detail === "string" ? detail : "This batch could not finish."} Earlier batches are saved. Run the same dates again to retry safely.` });
    } finally {
      setProcessingAbsences(false);
    }
  }

  function renderDeviceForm() {
    return (
      <Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField label="Device Name" value={device.name} required helperText="Must match Hik-Connect Device Name, e.g. Kendroo Office" onChange={(e) => setDevice({ ...device, name: e.target.value })} />
          <TextField label="Hikvision Device ID" helperText="Use Hik-Connect Device Serial No. (example: FV9370154) or the exact cloud device ID" value={device.external_device_id} onChange={(e) => setDevice({ ...device, external_device_id: e.target.value })} />
          <TextField label="HikCentral App Key" value={device.app_key} onChange={(e) => setDevice({ ...device, app_key: e.target.value })} />
          <TextField label="HikCentral Secret Key" type="password" value={device.secret_key} helperText={device.id ? "Leave blank to keep the existing secret." : "Stored server-side; never shown again."} onChange={(e) => setDevice({ ...device, secret_key: e.target.value })} />
          <TextField label="HikCentral Area Domain" placeholder="https://...hikcentralconnect.com" value={device.area_domain} onChange={(e) => setDevice({ ...device, area_domain: e.target.value })} />
          <TextField label="Device Timezone" value={device.timezone} helperText="Use Asia/Dhaka for Bangladesh." onChange={(e) => setDevice({ ...device, timezone: e.target.value })} />
        </Box>
        <FormControlLabel control={<Switch checked={device.active} onChange={(e) => setDevice({ ...device, active: e.target.checked })} />} label="Device is active" sx={{ mt: 1 }} />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<Save />} onClick={saveDevice} disabled={savingDevice}>
            {savingDevice ? "Saving..." : device.id ? "Save Device" : "Add Device"}
          </Button>
          <Button variant="outlined" onClick={() => setEditingId("")} disabled={savingDevice}>Cancel</Button>
        </Stack>
      </Box>
    );
  }

  function renderDeviceCard(item: HikvisionDevice) {
    if (editingId === item.id) {
      return (
        <Card variant="outlined" sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Edit Device</Typography>
            {renderDeviceForm()}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
            <Chip size="small" color={item.active ? "success" : "default"} label={item.active ? "Active" : "Removed"} />
          </Stack>
          <Typography variant="body2" color="text.secondary">{item.external_device_id || "No device ID set"}</Typography>
          {!item.credentials_configured ? (
            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>Credentials missing — add the App/Secret key</Alert>
          ) : null}
          {item.last_sync_at ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Last sync: {formatSyncTime(item.last_sync_at)}</Typography>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button size="small" startIcon={<Sync />} onClick={() => void testDeviceConnection(item.id)} disabled={testingId === item.id || savingDevice}>
              {testingId === item.id ? "Testing..." : "Test Connection"}
            </Button>
            <Button size="small" onClick={() => openEditDevice(item)} disabled={savingDevice}>Edit</Button>
            {item.active
              ? <Button size="small" color="error" onClick={() => setRemoving(item)} disabled={savingDevice}>Remove</Button>
              : <Button size="small" onClick={() => void restoreDevice(item)} disabled={savingDevice}>Restore</Button>}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1000 }}>
      <Alert severity="info">
        The fingerprint stays on the Hikvision device. KusKul receives the Card Number / person code and punch time; by default, Card Number matches the active student Roll Number.
      </Alert>

      <Card><CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Fingerprint color="primary" /><Typography variant="h6" fontWeight={700}>Hikvision Device Configuration</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Each device is tested, edited, or removed individually. Removing a device stops future syncs; its punch history is kept.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Button variant="contained" startIcon={<Add />} onClick={openAddDevice} disabled={savingDevice}>Add Device</Button>
          <FormControlLabel control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />} label="Show removed devices" />
        </Stack>
        {editingId === "__new__" ? (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Add Hikvision Device</Typography>
              {renderDeviceForm()}
            </CardContent>
          </Card>
        ) : null}
        {visibleDevices.length ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(300px, 1fr))" }, gap: 2 }}>
            {visibleDevices.map((item) => <Box key={item.id}>{renderDeviceCard(item)}</Box>)}
          </Box>
        ) : null}
        {!editingId && !visibleDevices.length ? (
          <Alert severity="info">No devices configured yet. Click <strong>Add Device</strong> to connect a Hikvision terminal.</Alert>
        ) : null}
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="h6" fontWeight={700} mb={1}>Student Card / Roll Mapping</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>Default: Hikvision Card Number must exactly equal the active enrollment Roll Number. A manual mapping is only needed when the device does not send a card number or the same roll is reused in multiple classes.</Typography>
        {selected ? (
          <>
            <Select fullWidth size="small" displayEmpty value={selected.id} sx={{ mb: 2 }} onChange={(event) => { void selectMappingDevice(devices.find((item) => item.id === event.target.value)); }}>
              {visibleDevices.map((item) => <MenuItem value={item.id} key={item.id}>{item.name}</MenuItem>)}
            </Select>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr auto" }, gap: 2, alignItems: "center" }}>
              <Autocomplete
                open={studentPickerOpen}
                onOpen={() => { setStudentSearch(""); setStudentPickerOpen(true); }}
                onClose={() => setStudentPickerOpen(false)}
                options={selectedStudent ? [selectedStudent, ...students.filter((student) => student.id !== selectedStudent.id)] : students}
                value={selectedStudent}
                loading={studentsLoading}
                filterOptions={(options) => options}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(student) => `${student.first_name} ${student.last_name || ""}${student.admission_no ? ` (${student.admission_no})` : ""}`.trim()}
                onInputChange={(_, value, reason) => { if (reason === "input" || reason === "clear") setStudentSearch(value); }}
                onChange={(_, student) => { setSelectedStudent(student); setMappingStudentId(student?.id || ""); }}
                renderInput={(params) => <TextField {...params} label="Search active students" placeholder="Name or admission number" />}
              />
              <TextField label="Hikvision Card Number / Person Code" value={personCode} onChange={(e) => setPersonCode(e.target.value)} />
              <Button variant="outlined" onClick={mapCredential}>Map Student</Button>
            </Box>
            {credentials.length ? <Box component="ul" sx={{ mb: 0, pl: 2.5 }}>
              {credentials.map((credential) => <li key={credential.id}><Typography variant="body2">{credential.person_code} — {credential.student_name} {credential.admission_no ? `(${credential.admission_no})` : ""}</Typography></li>)}
            </Box> : <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No student biometric IDs are mapped to this device yet.</Typography>}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Select or add a device to manage its student mappings.</Typography>
        )}
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>Attendance Calculation</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
          <TextField label="School Start Time" type="time" value={settings.school_start_time} InputLabelProps={{ shrink: true }} onChange={(e) => changeSetting("school_start_time", e.target.value)} />
          <TextField label="School End Time" type="time" value={settings.attendance_end_time} InputLabelProps={{ shrink: true }} helperText="After this time, students without biometric or teacher attendance are marked Absent." onChange={(e) => changeSetting("attendance_end_time", e.target.value)} />
          <TextField label="Hikvision Sync Interval (minutes)" type="number" value={10} InputProps={{ readOnly: true }} helperText="Runs every 10 minutes when the server scheduler is active. Only punches at least 12 minutes old are imported." />
          <TextField label="Late Grace (minutes)" type="number" inputProps={{ min: 0, max: 240 }} value={settings.late_grace_minutes} onChange={(e) => changeSetting("late_grace_minutes", Math.max(0, Number(e.target.value) || 0))} />
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>A punch from {lateAfter || "--:--"} onward is marked <strong>Late</strong>. This is calculated as school start time plus the late grace period.</Alert>
      </CardContent></Card>

      <Card><CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}><Sms color="primary" /><Typography variant="h6" fontWeight={700}>Guardian SMS Rules</Typography></Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          At most one SMS per student per category each day. Use the placeholders {"{{student_name}}"}, {"{{date}}"}, and {"{{time}}"} in the templates. No SMS is sent on the weekly holiday or on school holidays.
        </Typography>
        <FormControlLabel control={<Switch checked={settings.send_late_sms} onChange={(e) => changeSetting("send_late_sms", e.target.checked)} />} label="Queue an SMS when a late punch is imported (once per day)" />
        <TextField fullWidth multiline minRows={2} label="Late Arrival SMS" value={settings.late_sms_template} disabled={!settings.send_late_sms} onChange={(e) => changeSetting("late_sms_template", e.target.value)} helperText="Queued on the first late punch; delivered by the scheduled attendance worker." sx={{ mt: 1, mb: 2 }} />
        <Divider />
        <FormControlLabel control={<Switch checked={settings.send_absent_sms} onChange={(e) => changeSetting("send_absent_sms", e.target.checked)} />} label="Send an SMS at school end for students with no punch that day (once per day)" sx={{ mt: 2 }} />
        <TextField fullWidth multiline minRows={2} label="Fallback Absent SMS" value={settings.absent_sms_template} disabled={!settings.send_absent_sms} onChange={(e) => changeSetting("absent_sms_template", e.target.value)} helperText="Used only when the local AI writer is unavailable or its output fails validation." sx={{ mt: 1 }} />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={700}>AI Message Writer</Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Rules decide when to send. The local AI only writes the wording from verified attendance facts, so it cannot invent reasons, dates, or numbers. Bangla uses a reviewed built-in message unless the experimental AI option is enabled.
        </Typography>
        <FormControlLabel control={<Switch checked={settings.ai_sms_writer_enabled} onChange={(e) => changeSetting("ai_sms_writer_enabled", e.target.checked)} />} label="Use the local AI writer for absence and return-summary SMS" />
        <FormControlLabel control={<Switch checked={settings.ai_sms_bangla_enabled} onChange={(e) => changeSetting("ai_sms_bangla_enabled", e.target.checked)} disabled={!settings.ai_sms_writer_enabled} />} label="Use AI for Bangla messages (experimental; the small model may be slow or inaccurate)" sx={{ display: "flex" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mt: 1 }}>
          <TextField select label="Language" value={settings.ai_sms_language} onChange={(e) => changeSetting("ai_sms_language", e.target.value as AttendanceSettings["ai_sms_language"])} disabled={!settings.ai_sms_writer_enabled}>
            <MenuItem value="auto">Auto (student medium)</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="bn">Bangla</MenuItem>
          </TextField>
          <TextField select label="Tone" value={settings.ai_sms_tone} onChange={(e) => changeSetting("ai_sms_tone", e.target.value as AttendanceSettings["ai_sms_tone"])} disabled={!settings.ai_sms_writer_enabled}>
            <MenuItem value="friendly">Friendly</MenuItem>
            <MenuItem value="formal">Formal</MenuItem>
            <MenuItem value="concise">Concise</MenuItem>
          </TextField>
          <TextField label="Maximum SMS parts" type="number" value={settings.ai_sms_max_parts} inputProps={{ min: 1, max: 4 }} onChange={(e) => changeSetting("ai_sms_max_parts", Math.max(1, Math.min(4, Number(e.target.value) || 1)))} disabled={!settings.ai_sms_writer_enabled && !settings.send_absent_sms} helperText="1 part = 160 English or 70 Bangla characters." />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 1 }}>
          <TextField label="Send daily absence SMS for the first N school days" type="number" value={settings.absent_sms_first_days} inputProps={{ min: 0, max: 30 }} onChange={(e) => changeSetting("absent_sms_first_days", Math.max(0, Math.min(30, Number(e.target.value) || 0)))} helperText="After day N, no daily absence SMS is sent." />
          <FormControlLabel control={<Switch checked={settings.absent_sms_return_summary} onChange={(e) => changeSetting("absent_sms_return_summary", e.target.checked)} />} label="Send one return-summary SMS after a long absence" sx={{ display: "flex" }} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 1 }}>
          <TextField label="Mass-absence suppression threshold (%)" type="number" value={settings.absent_sms_mass_absence_threshold} inputProps={{ min: 1, max: 100 }} onChange={(e) => changeSetting("absent_sms_mass_absence_threshold", Math.max(1, Math.min(100, Number(e.target.value) || 1)))} helperText="Skip all absence SMS when this share of active students is absent." />
          <TextField label="Minimum students for mass-absence check" type="number" value={settings.absent_sms_mass_absence_min_students} inputProps={{ min: 1, max: 100000 }} onChange={(e) => changeSetting("absent_sms_mass_absence_min_students", Math.max(1, Number(e.target.value) || 1))} helperText="Small schools still suppress SMS when nobody attends." />
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          A student who returns after more than {settings.absent_sms_first_days} absent school days gets one summary SMS with the absence total, return time, and this month&apos;s late count. A queued late SMS for that return is replaced by the summary.
        </Alert>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>Weekly holidays (no SMS on these days)</Typography>
            <Select
              fullWidth
              size="small"
              multiple
              value={settings.weekly_holidays}
              onChange={(e) => changeSetting("weekly_holidays", e.target.value as number[])}
              renderValue={(selectedItems) => selectedItems.length
                ? selectedItems.map((item) => weekdayOptions.find((option) => option.value === item)?.label || "").join(", ")
                : "-"}
            >
              {weekdayOptions.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </Select>
          </Box>
          <FormControlLabel control={<Switch checked={settings.exclude_holidays_from_absence} onChange={(e) => changeSetting("exclude_holidays_from_absence", e.target.checked)} />} label="Do not mark absent or send SMS on configured holidays" sx={{ display: "flex" }} />
        </Box>
        <FormControlLabel control={<Switch checked={settings.auto_mark_absent} onChange={(e) => changeSetting("auto_mark_absent", e.target.checked)} />} label="Enable automatic absence processing after cutoff" sx={{ mt: 1, display: "flex" }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField label="Import from" type="date" value={importStart} onChange={(event) => setImportStart(event.target.value)} disabled={processingAbsences} InputLabelProps={{ shrink: true }} inputProps={{ min: earliestImport, max: importEnd || importToday }} />
          <TextField label="Import through" type="date" value={importEnd} onChange={(event) => setImportEnd(event.target.value)} disabled={processingAbsences} InputLabelProps={{ shrink: true }} inputProps={{ min: importStart || earliestImport, max: importToday }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Choose dates within the last 30 days ({selected?.timezone || "Asia/Dhaka"}). Punches must be at least 12 minutes old. Attendance is saved in batches of 100.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={processingAbsences ? <CircularProgress size={16} /> : <PlayArrow />} onClick={processAttendanceData} disabled={processingAbsences || !selected?.id}>
            {processingAbsences ? "Importing Attendance..." : "Process Attendance Data"}
          </Button>
          {processingAbsences && <Button onClick={() => { stopImport.current = true; }}>Stop after this batch</Button>}
        </Stack>
        {importProgress && <Typography role="status" variant="body2" sx={{ mt: 1 }}>{importProgress}</Typography>}
      </CardContent></Card>

      <Box><Button variant="contained" startIcon={<Save />} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Attendance Settings"}</Button></Box>

      <Dialog open={Boolean(removing)} onClose={() => !savingDevice && setRemoving(null)}>
        <DialogTitle>Remove device?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove <strong>{removing?.name}</strong>? It will stop syncing and marking student attendance, and it will be hidden from the list. Its punch history is kept. You can restore it later from "Show removed devices".
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)} disabled={savingDevice}>Cancel</Button>
          <Button color="error" onClick={() => void confirmRemoveDevice()} disabled={savingDevice}>{savingDevice ? "Removing..." : "Remove"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}