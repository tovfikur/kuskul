import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Event as EventIcon,
} from "@mui/icons-material";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { getCalendar, type Event } from "../../../api/analytics";

interface CalendarViewProps {
  onEdit: (event: Event) => void;
}

export default function CalendarView({ onEdit }: CalendarViewProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Record<string, Event[]>>({});

  const loadEvents = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1; // API expects 1-12
      const year = currentDate.getFullYear();
      const data = await getCalendar(month, year);
      setEvents(data.days || {});
    } catch (error) {
      console.error("Failed to load calendar events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: "divider" }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={prevMonth}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 150, textAlign: 'center' }}>
            {format(currentDate, "MMMM yyyy")}
          </Typography>
          <IconButton onClick={nextMonth}>
            <ChevronRight />
          </IconButton>
          <Button size="small" onClick={jumpToToday} sx={{ ml: 2 }}>
            Today
          </Button>
        </Box>
        <Box>
           {/* Legend or actions could go here */}
        </Box>
      </Box>

      {/* Weekday Headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        {weekDays.map((day) => (
          <Box
            key={day}
            sx={{
              p: 1.5,
              textAlign: "center",
              fontWeight: 600,
              color: "text.secondary",
              fontSize: "0.875rem",
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* Calendar Grid */}
      {loading ? (
        <Box sx={{ p: 10, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            // Use auto-fill rows but enforce min-height
          }}
        >
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = events[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);

            return (
              <Box
                key={day.toISOString()}
                sx={{
                  minHeight: 120,
                  borderRight: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: isCurrentMonth ? "background.paper" : "action.hover",
                  p: 1,
                  "&:nth-of-type(7n)": { borderRight: 0 }, // Remove right border for last column
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isCurrentDay ? 700 : 400,
                      color: isCurrentDay
                        ? "primary.main"
                        : isCurrentMonth
                        ? "text.primary"
                        : "text.secondary",
                      bgcolor: isCurrentDay ? "primary.soft" : "transparent",
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                    }}
                  >
                    {format(day, "d")}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {dayEvents.map((event) => (
                    <Tooltip key={event.id} title={`${event.title} (${event.event_type})`}>
                      <Box
                        onClick={() => onEdit(event)}
                        sx={{
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          opacity: 0.9,
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        {event.title}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
}
