import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import SyncIcon from "@mui/icons-material/Sync";

import { calculateDues, getFeeDues, type FeeDue } from "../../../api/finance";
import { getClasses, type SchoolClass } from "../../../api/academic";
import {
  getAcademicYears,
  getCurrentAcademicYear,
  type AcademicYear,
} from "../../../api/academic";
import { getStudentsBatch, type Student } from "../../../api/people";
import { showToast } from "../../../app/toast";
import { formatMoney, shortId } from "../financeUtils";

export function DuesTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FeeDue[]>([]);
  const [studentById, setStudentById] = useState<Record<string, Student>>({});
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [autoRecalcTried, setAutoRecalcTried] = useState(false);

  useEffect(() => {
    void Promise.all([getClasses(), getAcademicYears(), getCurrentAcademicYear()])
      .then(([c, y, current]) => {
        setClasses(c.filter((x) => x.is_active));
        setYears(y);
        setYearId(current.id);
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load master data" });
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getFeeDues({
        academic_year_id: yearId || undefined,
        class_id: classId || undefined,
        status: status || undefined,
      });
      setRows(list);
    } catch {
      showToast({ severity: "error", message: "Failed to load dues" });
    } finally {
      setLoading(false);
    }
  }, [classId, status, yearId]);

  useEffect(() => {
    if (!yearId) return;
    void load();
  }, [load]);

  useEffect(() => {
    if (!yearId) return;
    if (loading) return;
    if (rows.length > 0) return;
    if (autoRecalcTried) return;
    setAutoRecalcTried(true);
    void calculateDues({ academic_year_id: yearId })
      .then(() => load())
      .catch(() => {
        return;
      });
  }, [autoRecalcTried, loading, load, rows.length, yearId]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map((r) => r.student_id)));
    const missing = ids.filter((id) => !studentById[id]);
    if (missing.length === 0) return;
    let alive = true;
    void getStudentsBatch(missing).then((items) => {
      if (!alive) return;
      const next = { ...studentById };
      for (const s of items) {
        next[s.id] = s;
      }
      setStudentById(next);
    });
    return () => {
      alive = false;
    };
  }, [rows, studentById]);

  const studentLabel = (id: string): string => {
    const s = studentById[id];
    if (!s) return shortId(id);
    const name = [s.first_name, s.last_name || ""].filter(Boolean).join(" ").trim();
    return s.admission_no ? `${name} (${s.admission_no})` : name;
  };

  const overdueCount = useMemo(
    () => rows.filter((r) => r.status === "overdue").length,
    [rows],
  );

  const runRecalc = async () => {
    if (!confirm("Recalculate dues for the selected academic year?")) return;
    setRecalcLoading(true);
    try {
      await calculateDues({ academic_year_id: yearId || undefined });
      await load();
    } catch {
      showToast({ severity: "error", message: "Failed to recalculate dues" });
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Dues & Defaulters
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={`Rows: ${rows.length}`} variant="outlined" />
            <Chip size="small" label={`Overdue: ${overdueCount}`} color="warning" variant="outlined" />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select value={yearId} label="Academic Year" onChange={(e) => setYearId(e.target.value)}>
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Class</InputLabel>
            <Select value={classId} label="Class" onChange={(e) => setClassId(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="due">Due</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => void load()} disabled={loading}>
            Reload
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={() => void runRecalc()}
            disabled={recalcLoading}
          >
            Recalculate
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Due</TableCell>
              <TableCell>Last Calculated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{studentLabel(r.student_id)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.status}
                    color={r.status === "overdue" ? "warning" : r.status === "paid" ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{formatMoney(r.total_fee)}</TableCell>
                <TableCell align="right">{formatMoney(r.discount_amount)}</TableCell>
                <TableCell align="right">{formatMoney(r.paid_amount)}</TableCell>
                <TableCell align="right">{formatMoney(r.due_amount)}</TableCell>
                <TableCell>{r.last_calculated_date}</TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No dues found.</TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
