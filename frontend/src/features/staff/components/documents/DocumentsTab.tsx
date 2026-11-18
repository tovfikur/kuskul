import { useState } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";

import { ContractsPanel } from "./ContractsPanel";
import { DocumentsLibrary } from "./DocumentsLibrary";

export default function DocumentsTab() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Contracts" />
          <Tab label="Documents Library" />
        </Tabs>
      </Paper>

      {/* Tab 1: Contracts */}
      {activeTab === 0 ? <ContractsPanel /> : null}

      {/* Tab 2: Documents Library */}
      {activeTab === 1 ? <DocumentsLibrary /> : null}
    </Box>
  );
}
