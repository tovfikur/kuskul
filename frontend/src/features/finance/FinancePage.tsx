import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Chip, Paper, Tab, Tabs, Typography } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DownloadIcon from "@mui/icons-material/Download";
import ReceiptIcon from "@mui/icons-material/Receipt";
import SyncIcon from "@mui/icons-material/Sync";
import ArticleIcon from "@mui/icons-material/Article";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PaymentsIcon from "@mui/icons-material/Payments";
import PercentIcon from "@mui/icons-material/Percent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReportIcon from "@mui/icons-material/Report";

import { useAppSelector } from "../../app/hooks";
import { calculateDues } from "../../api/finance";
import { showToast } from "../../app/toast";

import { FinanceKpis } from "./components/FinanceKpis";
import { FeesTab } from "./components/FeesTab";
import { InvoicesTab } from "./components/InvoicesTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { DuesTab } from "./components/DuesTab";
import { DiscountsTab } from "./components/DiscountsTab";
import { ReportsTab } from "./components/ReportsTab";

type FinanceTabKey =
  | "fees"
  | "invoices"
  | "payments"
  | "dues"
  | "discounts"
  | "reports";

const TAB_KEYS: FinanceTabKey[] = [
  "fees",
  "invoices",
  "payments",
  "dues",
  "discounts",
  "reports",
];

function labelForTab(k: FinanceTabKey): string {
  if (k === "fees") return "Fees";
  if (k === "invoices") return "Invoices";
  if (k === "payments") return "Payments";
  if (k === "dues") return "Dues";
  if (k === "discounts") return "Discounts";
  return "Reports";
}

function iconForTab(k: FinanceTabKey) {
  if (k === "fees") return <MonetizationOnIcon fontSize="small" />;
  if (k === "invoices") return <ReceiptLongIcon fontSize="small" />;
  if (k === "payments") return <PaymentsIcon fontSize="small" />;
  if (k === "dues") return <ReceiptIcon fontSize="small" />;
  if (k === "discounts") return <PercentIcon fontSize="small" />;
  return <ReportIcon fontSize="small" />;
}

export default function FinancePage() {
  const [params, setParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [collectOpen, setCollectOpen] = useState(false);

  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId);
  const memberships = useAppSelector((s) => s.auth.memberships);

  const schoolName = useMemo(() => {
    const m = memberships.find((x) => x.school_id === activeSchoolId);
    return m?.school_name ?? "";
  }, [activeSchoolId, memberships]);

  const tabKey = (params.get("tab") as FinanceTabKey | null) ?? "fees";
  const activeTab: FinanceTabKey = TAB_KEYS.includes(tabKey) ? tabKey : "fees";
  const tabIndex = TAB_KEYS.indexOf(activeTab);

  const setTab = (k: FinanceTabKey) => {
    const next = new URLSearchParams(params);
    next.set("tab", k);
    setParams(next, { replace: true });
  };

  const recalc = async () => {
    if (!confirm("Recalculate dues for the current academic year?")) return;
    try {
      const res = await calculateDues();
      showToast({
        severity: "success",
        message: `Updated ${res.updated} students`,
      });
      setRefreshKey((p) => p + 1);
    } catch {
      showToast({ severity: "error", message: "Failed to recalculate dues" });
    }
  };

  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          mb: 2,
          color: "common.white",
          background:
            "linear-gradient(135deg, #0d47a1 0%, #1976d2 35%, #26c6da 100%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <AccountBalanceWalletIcon />
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Finance
              </Typography>
            </Box>
            <Typography sx={{ opacity: 0.92, mt: 0.75 }}>
              Fees, dues, discounts, and collections for day-to-day school
              operations.
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={schoolName || "School"}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  color: "common.white",
                }}
              />
              <Chip
                size="small"
                label={activeSchoolId ? "School scoped" : "No school selected"}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  color: "common.white",
                }}
              />
            </Box>
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
              variant="contained"
              startIcon={<ReceiptIcon />}
              sx={{
                backgroundColor: "rgba(255,255,255,0.18)",
                boxShadow: "none",
              }}
              onClick={() => {
                setTab("payments");
                setCollectOpen(true);
              }}
            >
              Collect Payment
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArticleIcon />}
              sx={{
                color: "common.white",
                borderColor: "rgba(255,255,255,0.6)",
              }}
              onClick={() => setTab("invoices")}
            >
              Issue Invoice
            </Button>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              sx={{
                color: "common.white",
                borderColor: "rgba(255,255,255,0.6)",
              }}
              onClick={() => void recalc()}
            >
              Recalculate Dues
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{
                color: "common.white",
                borderColor: "rgba(255,255,255,0.6)",
              }}
              onClick={() => setTab("reports")}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Paper>

      <FinanceKpis
        schoolName={schoolName || "School"}
        refreshKey={refreshKey}
      />

      <Paper sx={{ p: 1.5 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, idx) => setTab(TAB_KEYS[idx] ?? "fees")}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TAB_KEYS.map((k) => (
            <Tab
              key={k}
              icon={iconForTab(k)}
              iconPosition="start"
              label={labelForTab(k)}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === "fees" && <FeesTab />}
        {activeTab === "invoices" && <InvoicesTab />}
        {activeTab === "payments" && (
          <PaymentsTab
            openCollect={collectOpen}
            onCloseCollect={() => setCollectOpen(false)}
            onOpenCollect={() => setCollectOpen(true)}
          />
        )}
        {activeTab === "dues" && <DuesTab />}
        {activeTab === "discounts" && <DiscountsTab />}
        {activeTab === "reports" && <ReportsTab />}
      </Box>
    </Box>
  );
}
