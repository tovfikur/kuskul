import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Sms as SmsIcon,
  Email as EmailIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import {
  listCommunicationLogs,
  type CommunicationLog,
} from "../../api/communicationLogs";

const STATUSES = ["sent", "queued", "failed"];

export default function CommunicationLogsPage() {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selected, setSelected] = useState<CommunicationLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (type !== "all") params.communication_type = type;
        if (status !== "all") params.status = status;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const data = await listCommunicationLogs(params);
        if (!cancelled) setLogs(data);
      } catch (error) {
        console.error("Failed to load communication logs:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, status, startDate, endDate]);

  const counts = useMemo(() => {
    const c = { total: logs.length, sent: 0, queued: 0, failed: 0, sms: 0, email: 0 };
    for (const log of logs) {
      if (log.status === "sent") c.sent += 1;
      else if (log.status === "queued") c.queued += 1;
      else if (log.status === "failed") c.failed += 1;
      if (log.communication_type === "sms") c.sms += 1;
      else if (log.communication_type === "email") c.email += 1;
    }
    return c;
  }, [logs]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Communication Logs
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
        <Chip
          icon={<SmsIcon />}
          label={`SMS: ${counts.sms}`}
          color={counts.sms > 0 ? "primary" : "default"}
          variant={counts.sms > 0 ? "filled" : "outlined"}
        />
        <Chip
          icon={<EmailIcon />}
          label={`Email: ${counts.email}`}
          color={counts.email > 0 ? "secondary" : "default"}
          variant={counts.email > 0 ? "filled" : "outlined"}
        />
        <Chip
          label={`Sent: ${counts.sent}`}
          color={counts.sent > 0 ? "success" : "default"}
        />
        <Chip
          label={`Queued: ${counts.queued}`}
          color={counts.queued > 0 ? "warning" : "default"}
        />
        <Chip
          label={`Failed: ${counts.failed}`}
          color={counts.failed > 0 ? "error" : "default"}
        />
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="all">All statuses</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="From"
            slotProps={{ inputLabel: { shrink: true } }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            slotProps={{ inputLabel: { shrink: true } }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography color="text.secondary" align="center">
            No communication logs match the selected filters.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sent at</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  hover
                  onClick={() => setSelected(log)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Tooltip title={format(new Date(log.created_at), "PPpp")}>
                      <span>{format(new Date(log.created_at), "MMM dd, HH:mm")}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={log.communication_type === "sms" ? <SmsIcon /> : <EmailIcon />}
                      label={log.communication_type.toUpperCase()}
                      size="small"
                      color={log.communication_type === "sms" ? "primary" : "secondary"}
                    />
                  </TableCell>
                  <TableCell>{log.category || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size="small"
                      color={
                        log.status === "sent"
                          ? "success"
                          : log.status === "queued"
                            ? "warning"
                            : "error"
                      }
                    />
                  </TableCell>
                  <TableCell>{log.recipient}</TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.body || log.subject || "-"}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {selected.communication_type.toUpperCase()} to {selected.recipient}
              </Typography>
              <IconButton onClick={() => setSelected(null)} size="small" aria-label="close">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Sent {format(new Date(selected.created_at), "PPpp")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Chip
                  label={`Status: ${selected.status}`}
                  size="small"
                  color={
                    selected.status === "sent"
                      ? "success"
                      : selected.status === "queued"
                        ? "warning"
                        : "error"
                  }
                />
                {selected.category && <Chip label={selected.category} size="small" />}
              </Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Message
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
                {selected.body || selected.subject || "(no message)"}
              </Typography>
              {selected.provider_result && (
                <>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Provider response
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ whiteSpace: "pre-wrap", display: "block" }}
                  >
                    {selected.provider_result}
                  </Typography>
                </>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}