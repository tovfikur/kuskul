import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { listEvents, deleteEvent, type Event } from "../../../api/analytics";
import { format } from "date-fns";

const EVENT_TYPES = ["Holiday", "Exam", "Meeting", "Sports", "Cultural", "Notice", "Other"];

interface EventListProps {
  onEdit?: (event: Event) => void;
}

export default function EventList({ onEdit }: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  async function loadEvents() {
    setLoading(true);
    try {
      const params = filterType !== "all" ? { event_type: filterType } : undefined;
      const data = await listEvents(params);
      setEvents(data);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteEvent(id);
      loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {EVENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {events.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No events found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {event.title}
                      </Typography>
                      <Chip label={event.event_type} size="small" color="primary" />
                    </Box>
                    {event.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {event.description}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <Typography variant="caption" color="text.secondary">
                        📅 {format(new Date(event.start_date), "MMM dd, yyyy")} -{" "}
                        {format(new Date(event.end_date), "MMM dd, yyyy")}
                      </Typography>
                      {event.location && (
                        <Typography variant="caption" color="text.secondary">
                          📍 {event.location}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => onEdit?.(event)}
                      title="Edit event"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDelete(event.id)}
                      title="Delete event"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
