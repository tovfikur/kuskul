import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Chip, CircularProgress } from "@mui/material";
import { listEvents, type Event } from "../../../api/analytics";
import { format } from "date-fns";

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotices();
  }, []);

  async function loadNotices() {
    setLoading(true);
    try {
      const data = await listEvents({ event_type: "Notice" });
      // Sort by date, most recent first
      const sorted = data.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
      setNotices(sorted);
    } catch (error) {
      console.error("Failed to load notices:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notices.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary" align="center">
            No notices posted yet
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
      {notices.map((notice) => (
        <Card key={notice.id} elevation={2}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
              <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                {notice.title}
              </Typography>
              <Chip label="Notice" size="small" color="secondary" />
            </Box>
            {notice.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {notice.description}
              </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(notice.start_date), "MMM dd, yyyy")}
              </Typography>
              {notice.location && (
                <Typography variant="caption" color="text.secondary">
                  📍 {notice.location}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
