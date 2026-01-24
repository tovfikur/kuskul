import { useState, useCallback } from "react";
import { Box, Tabs, Tab, Typography, Fab } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import EventList from "./components/EventList";
import NoticeBoard from "./components/NoticeBoard";
import EventForm from "./components/EventForm";
import type { Event } from "../../api/analytics";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function EventsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEventSaved = useCallback(() => {
    // Refresh both tabs by incrementing key
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleCreateNew = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Events & Notices
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Events" />
          <Tab label="Notice Board" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <EventList key={`events-${refreshKey}`} onEdit={handleEdit} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <NoticeBoard key={`notices-${refreshKey}`} />
      </TabPanel>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 32, right: 32 }}
        onClick={handleCreateNew}
      >
        <AddIcon />
      </Fab>

      <EventForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSaved={handleEventSaved}
        event={editingEvent}
      />
    </Box>
  );
}
