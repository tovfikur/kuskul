import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import {
  getAcademicCalendarSettings,
  getAcademicYears,
  updateAcademicCalendarSettings,
  type AcademicCalendarSettings,
  type AcademicYear,
} from "../../../api/academic";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function maskToDays(mask: number): boolean[] {
  const days = Array.from({ length: 7 }, (_, i) => (mask & (1 << i)) !== 0);
  return days;
}

function daysToMask(days: boolean[]): number {
  return days.reduce((acc, on, idx) => (on ? acc | (1 << idx) : acc), 0);
}

export default function CalendarTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState("");
  const [settings, setSettings] = useState<AcademicCalendarSettings | null>(
    null
  );
  const [days, setDays] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]);
  const [shift, setShift] = useState("morning");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const y = await getAcademicYears();
      setYears(y);
      const current = y.find((it) => it.is_current);
      setYearId(current?.id || (y[0]?.id ?? ""));
    }
    init().catch(console.error);
  }, []);

  useEffect(() => {
    async function load() {
      if (!yearId) return;
      const s = await getAcademicCalendarSettings(yearId);
      setSettings(s);
      setDays(maskToDays(s.working_days_mask));
      setShift(s.shift);
    }
    load().catch(console.error);
  }, [yearId]);

  const workingDaysCount = useMemo(() => days.filter(Boolean).length, [days]);

  const toggleDay = (idx: number) => {
    setDays((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleSave = async () => {
    if (!yearId) return;
    setSaving(true);
    try {
      const next = await updateAcademicCalendarSettings(yearId, {
        working_days_mask: daysToMask(days),
        shift,
      });
      setSettings(next);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={yearId}
              label="Academic Year"
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? " (Current)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!settings || saving || workingDaysCount === 0}
          >
            Save Settings
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Working Days
        </Typography>
        <FormGroup row>
          {dayLabels.map((label, idx) => (
            <FormControlLabel
              key={label}
              control={
                <Checkbox checked={days[idx]} onChange={() => toggleDay(idx)} />
              }
              label={label}
            />
          ))}
        </FormGroup>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {workingDaysCount} working day(s) per week
        </Typography>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Shift
        </Typography>
        <FormControl sx={{ minWidth: 240 }} size="small">
          <InputLabel>Shift</InputLabel>
          <Select
            value={shift}
            label="Shift"
            onChange={(e) => setShift(e.target.value)}
          >
            <MenuItem value="morning">Morning</MenuItem>
            <MenuItem value="evening">Evening</MenuItem>
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
}
