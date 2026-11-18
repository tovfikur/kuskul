import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CloudUpload, Download, Warning } from "@mui/icons-material";

import {
  getExpiringContracts,
  listStaffContracts,
  uploadStaffContractDocument,
  type StaffContract,
} from "../../../../api/staffManagement";
import { StaffPicker, type StaffOption } from "./StaffPicker";
import { downloadDocument } from "../../../../api/documents";
import { downloadBlob } from "../../../finance/financeUtils";

function docIdFromUrl(url?: string) {
  if (!url) return null;
  const i = url.indexOf("/documents/");
  if (i < 0) return null;
  const rest = url.slice(i + "/documents/".length);
  const j = rest.indexOf("/download");
  const id = (j >= 0 ? rest.slice(0, j) : rest).trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
  return id;
}

function statusColor(s: string) {
  if (s === "active") return "success" as const;
  if (s === "terminated") return "error" as const;
  if (s === "expired") return "warning" as const;
  return "default" as const;
}

export function ContractsPanel() {
  const [staff, setStaff] = useState<StaffOption | null>(null);
  const [contracts, setContracts] = useState<StaffContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [expiring, setExpiring] = useState<StaffContract[]>([]);

  const refreshContracts = useMemo(
    () => async () => {
      if (!staff?.id) {
        setContracts([]);
        return;
      }
      setLoading(true);
      try {
        const resp = await listStaffContracts(staff.id);
        if (!resp.ok) {
          setContracts([]);
          return;
        }
        setContracts(resp.data as StaffContract[]);
      } finally {
        setLoading(false);
      }
    },
    [staff?.id],
  );

  useEffect(() => {
    void refreshContracts();
  }, [refreshContracts]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const resp = await getExpiringContracts(30);
      if (!alive) return;
      if (!resp.ok) {
        setExpiring([]);
        return;
      }
      setExpiring(resp.data as StaffContract[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleUpload = async (contractId: string, files: FileList | null) => {
    if (!staff?.id) return;
    const f = files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      await uploadStaffContractDocument(staff.id, contractId, f);
      await refreshContracts();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (contract: StaffContract) => {
    const docId = docIdFromUrl(contract.contract_document_url);
    if (!docId) return;
    const blob = await downloadDocument(docId);
    downloadBlob(blob, `contract_${contract.id}.pdf`);
  };

  return (
    <Box>
      {expiring.length > 0 ? (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          {expiring.length} contract(s) expiring within 30 days.
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <StaffPicker label="Select staff" value={staff} onChange={setStaff} />
          </Box>
          <Button variant="outlined" onClick={() => void refreshContracts()} disabled={loading || !staff?.id}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contract Type</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Document</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!staff?.id ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    Select a staff member to view contracts.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No contracts found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.contract_type}</TableCell>
                  <TableCell>{c.start_date.slice(0, 10)}</TableCell>
                  <TableCell>{c.end_date ? c.end_date.slice(0, 10) : "Ongoing"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={c.status} color={statusColor(c.status)} />
                  </TableCell>
                  <TableCell>
                    {c.contract_document_url ? (
                      <Button size="small" startIcon={<Download />} onClick={() => void handleDownload(c)}>
                        Download
                      </Button>
                    ) : (
                      <Button component="label" size="small" startIcon={<CloudUpload />} disabled={loading}>
                        Upload PDF
                        <input hidden type="file" accept="application/pdf,image/*" onChange={(e) => void handleUpload(c.id, e.currentTarget.files)} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
