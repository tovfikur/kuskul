import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import Grid2 from "@mui/material/Grid";

import { aggregationOptions, examStatusOptions } from "./examMasterUtils";
import type { ExamForm, ExamTypeOption } from "./types";

type Props = {
  open: boolean;
  title: string;
  examTypeOptions: ExamTypeOption[];
  value: ExamForm;
  onChange: (next: ExamForm) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function OfflineExamMasterDialog(props: Props) {
  const { open, title, examTypeOptions, value, onChange, onClose, onSubmit } =
    props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2} sx={{ mt: 0 }}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField
              label="Exam name"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              fullWidth
              margin="normal"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <TextField
              label="Exam code"
              value={value.exam_code}
              onChange={(e) =>
                onChange({ ...value, exam_code: e.target.value })
              }
              fullWidth
              margin="normal"
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Exam type</InputLabel>
              <Select
                label="Exam type"
                value={value.exam_type}
                onChange={(e) =>
                  onChange({ ...value, exam_type: e.target.value })
                }
              >
                {examTypeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            {value.exam_type === "Other" ? (
              <TextField
                label="Custom exam type"
                value={value.exam_type_custom}
                onChange={(e) =>
                  onChange({ ...value, exam_type_custom: e.target.value })
                }
                fullWidth
                margin="normal"
              />
            ) : (
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={value.status}
                  onChange={(e) =>
                    onChange({ ...value, status: e.target.value })
                  }
                >
                  {examStatusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Start date"
              type="date"
              value={value.start_date}
              onChange={(e) =>
                onChange({ ...value, start_date: e.target.value })
              }
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="End date"
              type="date"
              value={value.end_date}
              onChange={(e) => onChange({ ...value, end_date: e.target.value })}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Weight %"
              type="number"
              value={value.weight_percentage}
              onChange={(e) =>
                onChange({ ...value, weight_percentage: e.target.value })
              }
              fullWidth
              margin="normal"
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Aggregation</InputLabel>
              <Select
                label="Aggregation"
                value={value.aggregation_method}
                onChange={(e) =>
                  onChange({ ...value, aggregation_method: e.target.value })
                }
              >
                {aggregationOptions.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Best-of count"
              type="number"
              value={value.best_of_count}
              onChange={(e) =>
                onChange({ ...value, best_of_count: e.target.value })
              }
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 100 }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Result entry deadline"
              type="date"
              value={value.result_entry_deadline}
              onChange={(e) =>
                onChange({ ...value, result_entry_deadline: e.target.value })
              }
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Result publish date"
              type="date"
              value={value.result_publish_date}
              onChange={(e) =>
                onChange({ ...value, result_publish_date: e.target.value })
              }
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={value.status}
                onChange={(e) => onChange({ ...value, status: e.target.value })}
              >
                {examStatusOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              sx={{ mt: 2 }}
              control={
                <Switch
                  checked={value.included_in_final_result}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      included_in_final_result: e.target.checked,
                    })
                  }
                />
              }
              label="Included in final result"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              sx={{ mt: 2 }}
              control={
                <Switch
                  checked={value.counts_for_gpa}
                  onChange={(e) =>
                    onChange({ ...value, counts_for_gpa: e.target.checked })
                  }
                />
              }
              label="Counts for GPA"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Switch
                  checked={value.is_result_editable}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      is_result_editable: e.target.checked,
                    })
                  }
                />
              }
              label="Results editable"
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <TextField
              label="Instructions"
              value={value.instructions}
              onChange={(e) =>
                onChange({ ...value, instructions: e.target.value })
              }
              fullWidth
              margin="normal"
              multiline
              minRows={3}
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

