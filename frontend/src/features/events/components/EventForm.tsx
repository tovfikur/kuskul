import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Divider,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { createEvent, updateEvent, type EventCreate, type Event } from "../../../api/analytics";

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  event?: Event | null;
}

const EVENT_TYPES = ["Holiday", "Exam", "Meeting", "Sports", "Cultural", "Notice", "Other"];

export default function EventForm({ open, onClose, onSaved, event }: EventFormProps) {
  const [formData, setFormData] = useState<EventCreate>({
    title: "",
    description: "",
    event_type: "Other",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    location: "",
    is_all_day: true,
    announced_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      // Editing existing event
      setFormData({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type || "Other",
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location || "",
        is_all_day: event.is_all_day,
        announced_by: (event as any).announced_by || "", // Assuming announced_by might not be on Event type yet
      });
    } else {
      // Creating new event - reset to defaults
      setFormData({
        title: "",
        description: "",
        event_type: "Other",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        location: "",
        is_all_day: true,
        announced_by: "",
      });
    }
    setErrors({});
  }, [event, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
   }

    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = "End date must be on or after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (event) {
        // Update existing event
        await updateEvent(event.id, formData);
      } else {
        // Create new event
        await createEvent(formData);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      setErrors({ submit: "Failed to save event. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EventCreate, value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0,
        p: 2.5, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}>
        <Typography variant="h6" component="div" fontWeight={600}>
          {event ? "Edit Event" : "Create New Event"}
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{ 
            color: "text.secondary",
            "&:hover": { bgcolor: "action.hover" }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Title Field - Full Width */}
          <TextField
            label="Event Title"
            fullWidth
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            error={!!errors.title}
            helperText={errors.title || "Enter a descriptive title for your event or notice"}
            required
            placeholder="e.g., Annual Sports Day, Parent-Teacher Meeting, Exam Schedule"
            variant="outlined"
          />

          {/* Event Type and Location - Side by Side */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={formData.event_type}
                label="Event Type"
                onChange={(e) => handleChange("event_type", e.target.value)}
              >
                {EVENT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Location"
              fullWidth
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g., Main Auditorium, School Ground"
              variant="outlined"
            />
          </Box>

          {/* Announced By Field - Full Width */}
          <TextField
            label="Announced By"
            fullWidth
            value={formData.announced_by}
            onChange={(e) => handleChange("announced_by", e.target.value)}
            placeholder="e.g., Principal, Department Head, Admin Office"
            variant="outlined"
          />

          {/* Date Fields - Side by Side */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              error={!!errors.start_date}
              helperText={errors.start_date}
              InputLabelProps={{ shrink: true }}
              required
              variant="outlined"
            />

            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={formData.end_date}
              onChange={(e) => handleChange("end_date", e.target.value)}
              error={!!errors.end_date}
              helperText={errors.end_date}
              InputLabelProps={{ shrink: true }}
              required
              variant="outlined"
            />
          </Box>

          {/* Description Field - Full Width */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder={
              formData.event_type === "Notice" 
                ? "Provide clear and detailed information for the notice..." 
                : "Provide additional details about the event..."
            }
            helperText={
              formData.event_type === "Notice" 
                ? "For notices, ensure all important information is clearly communicated" 
                : ""
            }
            variant="outlined"
          />

          {/* All Day Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_all_day}
                onChange={(e) => handleChange("is_all_day", e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                This is an all-day event
              </Typography>
            }
          />

          {/* Error Message */}
          {errors.submit && (
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: "error.lighter", 
                borderRadius: 1,
                border: "1px solid",
                borderColor: "error.main",
              }}
            >
              <Typography color="error" variant="body2" fontWeight={500}>
                {errors.submit}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={saving}
          variant="outlined"
          color="inherit"
          sx={{ minWidth: 90 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
          sx={{ minWidth: 110 }}
        >
          {saving ? "Saving..." : event ? "Save Changes" : "Create Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
