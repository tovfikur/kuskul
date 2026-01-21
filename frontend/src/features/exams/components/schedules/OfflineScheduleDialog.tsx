import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import Grid2 from "@mui/material/Grid";

import type { Exam } from "../../../../api/exams";
import type { SchoolClass, Subject } from "../../../../api/academic";
import type { ScheduleForm } from "./types";

type Props = {
  open: boolean;
  title: string;
  exams: Exam[];
  classes: SchoolClass[];
  subjects: Subject[];
  value: ScheduleForm;
  disableScopeEdits: boolean;
  onChange: (next: ScheduleForm) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function OfflineScheduleDialog(props: Props) {
  const {
    open,
    title,
    exams,
    classes,
    subjects,
    value,
    disableScopeEdits,
    onChange,
    onClose,
    onSubmit,
  } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2} sx={{ mt: 0 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Exam</InputLabel>
              <Select
                label="Exam"
                value={value.exam_id}
                onChange={(e) => onChange({ ...value, exam_id: e.target.value })}
                disabled={disableScopeEdits}
              >
                <MenuItem value="">Select...</MenuItem>
                {exams.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Class</InputLabel>
              <Select
                label="Class"
                value={value.class_id}
                onChange={(e) =>
                  onChange({ ...value, class_id: e.target.value })
                }
                disabled={disableScopeEdits}
              >
                <MenuItem value="">Select...</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Subject</InputLabel>
              <Select
                label="Subject"
                value={value.subject_id}
                onChange={(e) =>
                  onChange({ ...value, subject_id: e.target.value })
                }
                disabled={disableScopeEdits}
              >
                <MenuItem value="">Select...</MenuItem>
                {subjects.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Date"
              type="date"
              value={value.exam_date}
              onChange={(e) => onChange({ ...value, exam_date: e.target.value })}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Start time"
              type="time"
              value={value.start_time}
              onChange={(e) =>
                onChange({ ...value, start_time: e.target.value })
              }
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="End time"
              type="time"
              value={value.end_time}
              onChange={(e) => onChange({ ...value, end_time: e.target.value })}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Max marks"
              type="number"
              value={value.max_marks}
              onChange={(e) => onChange({ ...value, max_marks: e.target.value })}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 1000 }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField
              label="Room"
              value={value.room}
              onChange={(e) => onChange({ ...value, room: e.target.value })}
              fullWidth
              margin="normal"
            />
          </Grid2>
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
