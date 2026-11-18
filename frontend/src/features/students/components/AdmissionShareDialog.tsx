import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Close,
  ContentCopy,
  Download,
  OpenInNew,
  QrCode2,
  Refresh,
} from "@mui/icons-material";

import {
  getAdmissionFormLink,
  getAdmissionFormQr,
  rotateAdmissionFormLink,
  setAdmissionFormEnabled,
  type AdmissionFormLink,
} from "../../../api/admissions";
import { showToast } from "../../../app/toast";

const BASE_URL_STORAGE_KEY = "kuskul_admission_form_base_url";

interface AdmissionShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AdmissionShareDialog({ open, onClose }: AdmissionShareDialogProps) {
  const [link, setLink] = useState<AdmissionFormLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState(() => {
    try {
      return (
        localStorage.getItem(BASE_URL_STORAGE_KEY) ||
        (typeof window !== "undefined" ? window.location.origin : "")
      );
    } catch {
      return "";
    }
  });
  const qrObjectUrl = useRef<string | null>(null);

  const publicUrl =
    link && baseUrl.trim()
      ? `${baseUrl.trim().replace(/\/+$/, "")}/apply/${link.token}`
      : "";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getAdmissionFormLink()
      .then((data) => {
        if (!cancelled) setLink(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!publicUrl) {
      setQrUrl("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      getAdmissionFormQr(publicUrl)
        .then((blob) => {
          if (cancelled) return;
          if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
          qrObjectUrl.current = URL.createObjectURL(blob);
          setQrUrl(qrObjectUrl.current);
        })
        .catch((err) => {
          console.error(err);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [publicUrl]);

  useEffect(() => {
    return () => {
      if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
    };
  }, []);

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    try {
      localStorage.setItem(BASE_URL_STORAGE_KEY, value);
    } catch {
      // Ignore storage errors
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast({ severity: "success", message: "Admission form link copied" });
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to copy link" });
    }
  }

  function downloadQr() {
    if (!qrUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrUrl;
    anchor.download = "admission-form-qr.svg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function toggleEnabled() {
    if (!link) return;
    setBusy(true);
    try {
      const next = await setAdmissionFormEnabled(!link.enabled);
      setLink(next);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function rotateLink() {
    if (!window.confirm("Regenerate the admission link? Existing QR codes and links will stop working.")) {
      return;
    }
    setBusy(true);
    try {
      const next = await rotateAdmissionFormLink();
      setLink(next);
      showToast({ severity: "success", message: "A new admission link was generated" });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <QrCode2 color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Share Admission Form
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Let parents submit student information by scanning a QR code.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }} disabled={busy}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : link ? (
          <Stack spacing={2.5}>
            {!link.enabled && (
              <Alert severity="warning">
                The public admission form is disabled. Scanning the QR code will show an unavailable message.
              </Alert>
            )}

            <TextField
              fullWidth
              label="Public base URL"
              value={baseUrl}
              onChange={(event) => handleBaseUrlChange(event.target.value)}
              helperText="Use your school domain, or a LAN address when testing from a phone."
            />

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 180,
                  height: 180,
                  flexShrink: 0,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "background.paper",
                  p: 1,
                }}
              >
                {qrUrl ? (
                  <Box component="img" src={qrUrl} alt="Admission form QR code" sx={{ width: "100%", height: "100%" }} />
                ) : (
                  <CircularProgress size={28} />
                )}
              </Box>

              <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Admission form link"
                  value={publicUrl}
                  InputProps={{ readOnly: true }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={<ContentCopy />} onClick={copyLink} disabled={!publicUrl}>
                    Copy
                  </Button>
                  <Button variant="outlined" startIcon={<Download />} onClick={downloadQr} disabled={!qrUrl}>
                    QR
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNew />}
                    onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                    disabled={!publicUrl}
                  >
                    Open
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={link.enabled}
                    onChange={toggleEnabled}
                    disabled={busy}
                  />
                }
                label={link.enabled ? "Form is accepting applications" : "Form is disabled"}
              />
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Refresh />}
                onClick={rotateLink}
                disabled={busy}
              >
                Regenerate link
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Alert severity="error">Could not load the admission form link.</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
