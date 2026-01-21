import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Typography,
  Grid,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import PaidIcon from "@mui/icons-material/Paid";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import {
  getCollectionSummary,
  getFeeDefaulters,
  getFeeStats,
  type CollectionSummary,
  type FeeStats,
} from "../../../api/finance";
import {
  getAcademicYears,
  getCurrentAcademicYear,
  type AcademicYear,
} from "../../../api/academic";
import {
  endOfMonth,
  formatMoney,
  isoDate,
  startOfMonth,
} from "../financeUtils";

type Period = "this_month" | "custom";

type Props = {
  schoolName: string;
  refreshKey?: number;
};

export function FinanceKpis(props: Props) {
  const { schoolName, refreshKey } = props;

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState<string>("");

  const [period, setPeriod] = useState<Period>("this_month");
  const [customStart, setCustomStart] = useState<string>(
    isoDate(startOfMonth(new Date())),
  );
  const [customEnd, setCustomEnd] = useState<string>(
    isoDate(endOfMonth(new Date())),
  );

  const range = useMemo(() => {
    if (period === "custom") return { start: customStart, end: customEnd };
    const now = new Date();
    return {
      start: isoDate(startOfMonth(now)),
      end: isoDate(endOfMonth(now)),
    };
  }, [customEnd, customStart, period]);

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [defaultersCount, setDefaultersCount] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([getAcademicYears(), getCurrentAcademicYear()])
      .then(([y, current]) => {
        setYears(y);
        setYearId(current.id);
      })
      .catch(() => {
        return;
      });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([
      getFeeStats({ academic_year_id: yearId || undefined }),
      getCollectionSummary({ start_date: range.start, end_date: range.end }),
      getFeeDefaulters({ academic_year_id: yearId || undefined }),
    ])
      .then(([s, c, defaulters]) => {
        if (!alive) return;
        setStats(s);
        setSummary(c);
        setDefaultersCount(defaulters.length);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range.end, range.start, refreshKey, yearId]);

  const kpiCards = [
    {
      label: "Collected",
      value: summary ? formatMoney(summary.collected) : "—",
      tone: "success" as const,
      icon: <PaidIcon />,
      gradient: "linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)",
    },
    {
      label: "Refunded",
      value: summary ? formatMoney(summary.refunded) : "—",
      tone: "warning" as const,
      icon: <MoneyOffIcon />,
      gradient: "linear-gradient(135deg, #ef6c00 0%, #ffa726 100%)",
    },
    {
      label: "Net",
      value: summary ? formatMoney(summary.net) : "—",
      tone: "info" as const,
      icon: <AccountBalanceIcon />,
      gradient: "linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)",
    },
    {
      label: "Total Due",
      value: stats ? formatMoney(stats.due) : "—",
      tone: "error" as const,
      icon: <WarningAmberIcon />,
      gradient: "linear-gradient(135deg, #c62828 0%, #ef5350 100%)",
    },
  ];

  return (
    <Paper sx={{ p: 2.5, mb: 3 }}>
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
            Finance Overview
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={schoolName || "School"} />
            <Chip
              size="small"
              label={`${range.start} → ${range.end}`}
              variant="outlined"
            />
            {defaultersCount != null && (
              <Chip
                size="small"
                label={`Defaulters: ${defaultersCount}`}
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <MenuItem value="this_month">This month</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={yearId}
              label="Academic Year"
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {period === "custom" && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Start
                </Typography>
                <Box
                  component="input"
                  value={customStart}
                  onChange={(e) =>
                    setCustomStart((e.target as HTMLInputElement).value)
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
                  value={customEnd}
                  onChange={(e) =>
                    setCustomEnd((e.target as HTMLInputElement).value)
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
            </Box>
          )}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {kpiCards.map((k) => (
          <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                color: "common.white",
                background: k.gradient,
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {k.label}
                </Typography>
                <Box sx={{ opacity: 0.95 }}>{k.icon}</Box>
              </Box>
              {loading ? (
                <Skeleton variant="text" height={40} />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {k.value}
                </Typography>
              )}
              <Chip
                size="small"
                label={k.label}
                color={k.tone}
                sx={{
                  alignSelf: "flex-start",
                  mt: 0.5,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  color: "common.white",
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
