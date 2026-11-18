import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Delete, Download, UploadFile } from "@mui/icons-material";

import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
  bulkUploadDocuments,
  type DocumentOut,
} from "../../../../api/documents";
import { downloadBlob, shortId } from "../../../finance/financeUtils";
import { StudentPicker, type StudentOption } from "../../../finance/components/StudentPicker";
import { GuardianPicker, type GuardianOption } from "./GuardianPicker";
import { StaffPicker, type StaffOption } from "./StaffPicker";
import { listStaffContracts, type StaffContract } from "../../../../api/staffManagement";

type Scope = "all" | "student" | "guardian" | "staff" | "contract";

function prettyType(t: string | null) {
  if (!t) return "—";
  return t.replaceAll("_", " ");
}

export function DocumentsLibrary() {
  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");

  const [student, setStudent] = useState<StudentOption | null>(null);
  const [guardian, setGuardian] = useState<GuardianOption | null>(null);
  const [staff, setStaff] = useState<StaffOption | null>(null);
  const [contracts, setContracts] = useState<StaffContract[]>([]);
  const [contractId, setContractId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<DocumentOut[]>([]);

  const selectedEntity = useMemo(() => {
    if (scope === "student") return { entityType: "student", entityId: student?.id };
    if (scope === "guardian") return { entityType: "guardian", entityId: guardian?.id };
    if (scope === "staff") return { entityType: "staff", entityId: staff?.id };
    if (scope === "contract") return { entityType: "staff_contract", entityId: contractId || undefined };
    return { entityType: undefined, entityId: undefined };
  }, [contractId, guardian?.id, scope, staff?.id, student?.id]);

  useEffect(() => {
    setStudent(null);
    setGuardian(null);
    setStaff(null);
    setContracts([]);
    setContractId("");
  }, [scope]);

  useEffect(() => {
    let alive = true;
    if (scope !== "contract") return;
    if (!staff?.id) {
      setContracts([]);
      setContractId("");
      return;
    }
    void (async () => {
      const resp = await listStaffContracts(staff.id);
      if (!alive) return;
      if (!resp.ok) {
        setContracts([]);
        setContractId("");
        return;
      }
      setContracts(resp.data as StaffContract[]);
      setContractId("");
    })();
    return () => {
      alive = false;
    };
  }, [scope, staff?.id]);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const data = await listDocuments({
          entityType: selectedEntity.entityType,
          entityId: selectedEntity.entityId,
        });
        setDocs(data);
      } finally {
        setLoading(false);
      }
    },
    [selectedEntity.entityId, selectedEntity.entityType],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.filename.toLowerCase().includes(q));
  }, [docs, search]);

  const canUpload = useMemo(() => {
    if (scope === "all") return true;
    return Boolean(selectedEntity.entityType && selectedEntity.entityId);
  }, [scope, selectedEntity.entityId, selectedEntity.entityType]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const entityType = scope === "all" ? undefined : selectedEntity.entityType;
      const entityId = scope === "all" ? undefined : selectedEntity.entityId;
      if (files.length === 1) {
        await uploadDocument({ file: files[0], entityType, entityId });
      } else {
        await bulkUploadDocuments({ files: Array.from(files), entityType, entityId });
      }
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (d: DocumentOut) => {
    const blob = await downloadDocument(d.id);
    downloadBlob(blob, d.filename || `document_${d.id}`);
  };

  const handleDelete = async (d: DocumentOut) => {
    await deleteDocument(d.id);
    await refresh();
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Scope</InputLabel>
            <Select value={scope} label="Scope" onChange={(e) => setScope(e.target.value as Scope)}>
              <MenuItem value="all">All Documents</MenuItem>
              <MenuItem value="student">Student Documents</MenuItem>
              <MenuItem value="guardian">Parent/Guardian IDs</MenuItem>
              <MenuItem value="staff">Staff IDs</MenuItem>
              <MenuItem value="contract">Staff Contracts</MenuItem>
            </Select>
          </FormControl>

          {scope === "student" ? (
            <Box sx={{ flex: 1 }}>
              <StudentPicker label="Student" value={student} onChange={setStudent} />
            </Box>
          ) : null}

          {scope === "guardian" ? (
            <Box sx={{ flex: 1 }}>
              <GuardianPicker label="Guardian" value={guardian} onChange={setGuardian} />
            </Box>
          ) : null}

          {scope === "staff" ? (
            <Box sx={{ flex: 1 }}>
              <StaffPicker label="Staff" value={staff} onChange={setStaff} />
            </Box>
          ) : null}

          {scope === "contract" ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ flex: 1 }}>
              <Box sx={{ flex: 1 }}>
                <StaffPicker label="Staff" value={staff} onChange={setStaff} />
              </Box>
              <FormControl sx={{ minWidth: 240 }}>
                <InputLabel>Contract</InputLabel>
                <Select value={contractId} label="Contract" onChange={(e) => setContractId(String(e.target.value))}>
                  {contracts.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.contract_type} • {c.start_date.slice(0, 10)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          ) : null}

          <TextField label="Search filename" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
            <Button component="label" variant="contained" startIcon={<UploadFile />} disabled={!canUpload || uploading}>
              Upload
              <input hidden type="file" multiple onChange={(e) => void handleUploadFiles(e.currentTarget.files)} />
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Chip size="small" label={`Showing: ${scope}`} />
          {selectedEntity.entityType && selectedEntity.entityId ? (
            <>
              <Chip size="small" label={`entity_type: ${selectedEntity.entityType}`} />
              <Chip size="small" label={`entity_id: ${shortId(selectedEntity.entityId)}`} />
            </>
          ) : null}
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Filename</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Loading documents…
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No documents found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>{d.filename}</TableCell>
                  <TableCell>{d.content_type || "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                      <Chip size="small" label={prettyType(d.entity_type)} />
                      <Typography variant="caption" color="text.secondary">
                        {d.entity_id ? shortId(d.entity_id) : "—"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" startIcon={<Download />} onClick={() => void handleDownload(d)}>
                        Download
                      </Button>
                      <Button size="small" color="error" startIcon={<Delete />} onClick={() => void handleDelete(d)}>
                        Delete
                      </Button>
                    </Stack>
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

