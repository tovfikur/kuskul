import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
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
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import {
  getClassWiseCollection,
  getCollectionSummary,
  getDueList,
  getPaymentHistory,
} from "../../../api/finance";
import {
  getAcademicYears,
  getClasses,
  getCurrentAcademicYear,
  type AcademicYear,
  type SchoolClass,
} from "../../../api/academic";
import { showToast } from "../../../app/toast";
import {
  downloadBlob,
  endOfMonth,
  isoDate,
  startOfMonth,
  toCsv,
} from "../financeUtils";
import { ClassWiseCollectionChart } from "./ClassWiseCollectionChart";

type ReportKind =
  | "collection_summary"
  | "due_list"
  | "payment_history"
  | "class_wise_collection";

export function ReportsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [report, setReport] = useState<ReportKind>("collection_summary");

  const [startDate, setStartDate] = useState<string>(
    isoDate(startOfMonth(new Date())),
  );
  const [endDate, setEndDate] = useState<string>(
    isoDate(endOfMonth(new Date())),
  );
  const [classId, setClassId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    void Promise.all([
      getAcademicYears(),
      getCurrentAcademicYear(),
      getClasses(),
    ])
      .then(([y, current, c]) => {
        setYears(y);
        setAcademicYearId(current.id);
        setClasses(c.filter((x) => x.is_active));
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load master data" });
      });
  }, []);

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  );

  const run = async () => {
    setLoading(true);
    setRows([]);
    try {
      if (report === "collection_summary") {
        const out = await getCollectionSummary({
          start_date: startDate,
          end_date: endDate,
        });
        setRows([
          {
            start_date: startDate,
            end_date: endDate,
            collected: out.collected,
            refunded: out.refunded,
            net: out.net,
          },
        ]);
      }
      if (report === "due_list") {
        const out = await getDueList({ class_id: classId || undefined });
        setRows(out);
      }
      if (report === "payment_history") {
        const out = await getPaymentHistory({
          student_id: studentId.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setRows(out);
      }
      if (report === "class_wise_collection") {
        if (!academicYearId) {
          showToast({ severity: "error", message: "Select an academic year" });
          return;
        }
        const out = await getClassWiseCollection({
          academic_year_id: academicYearId,
        });
        setRows(
          out.map((r) => ({
            class_id: r.class_id,
            class_name: classNameById.get(r.class_id) ?? r.class_id,
            collected: r.collected,
          })),
        );
      }
    } catch {
      showToast({ severity: "error", message: "Failed to run report" });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      showToast({ severity: "info", message: "Nothing to export" });
      return;
    }
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `finance_report_${report}.csv`);
  };

  const chartData = useMemo(() => {
    if (report !== "class_wise_collection") return [];
    return rows
      .map((r) => ({
        name: String(r.class_name ?? r.class_id ?? ""),
        collected: Number(r.collected ?? 0),
      }))
      .sort((a, b) => b.collected - a.collected);
  }, [report, rows]);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Reports
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            Run finance reports and export results.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => void run()}
            disabled={loading}
          >
            Run
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Report</InputLabel>
          <Select
            value={report}
            label="Report"
            onChange={(e) => setReport(e.target.value as ReportKind)}
          >
            <MenuItem value="collection_summary">Collection summary</MenuItem>
            <MenuItem value="due_list">Due list</MenuItem>
            <MenuItem value="payment_history">Payment history</MenuItem>
            <MenuItem value="class_wise_collection">
              Class-wise collection
            </MenuItem>
          </Select>
        </FormControl>

        {(report === "collection_summary" || report === "payment_history") && (
          <>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Start
              </Typography>
              <Box
                component="input"
                value={startDate}
                onChange={(e) =>
                  setStartDate((e.target as HTMLInputElement).value)
                }
                type="date"
                style={{
                  height: 40,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                End
              </Typography>
              <Box
                component="input"
                value={endDate}
                onChange={(e) =>
                  setEndDate((e.target as HTMLInputElement).value)
                }
                type="date"
                style={{
                  height: 40,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </Box>
          </>
        )}

        {report === "due_list" && (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={classId}
              label="Class"
              onChange={(e) => setClassId(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {report === "payment_history" && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Student ID (optional)
            </Typography>
            <Box
              component="input"
              value={studentId}
              onChange={(e) =>
                setStudentId((e.target as HTMLInputElement).value)
              }
              placeholder="uuid"
              style={{
                height: 40,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                width: 260,
              }}
            />
          </Box>
        )}

        {report === "class_wise_collection" && (
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={academicYearId}
              label="Academic Year"
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {report === "class_wise_collection" && chartData.length > 0 && (
        <ClassWiseCollectionChart data={chartData} />
      )}

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {rows.length === 0 ? (
                <TableCell>Run a report to see results.</TableCell>
              ) : (
                Object.keys(rows[0]).map((k) => (
                  <TableCell key={k}>{k}</TableCell>
                ))
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx} hover>
                {Object.keys(rows[0]).map((k) => (
                  <TableCell key={k}>{String(r[k] ?? "")}</TableCell>
                ))}
              </TableRow>
            ))}
            {loading && (
              <TableRow>
                <TableCell>Loading...</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
