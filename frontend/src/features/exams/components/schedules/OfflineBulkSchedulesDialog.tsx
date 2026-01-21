import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import type { Exam } from "../../../../api/exams";
import type { SchoolClass, Subject } from "../../../../api/academic";
import type { BulkRow } from "./types";

type Props = {
  open: boolean;
  selectedExam: Exam | null;
  classes: SchoolClass[];
  subjects: Subject[];
  rows: BulkRow[];
  onRowsChange: (next: BulkRow[]) => void;
  onClose: () => void;
  onAddRow: () => void;
  onSubmit: () => void;
};

export function OfflineBulkSchedulesDialog(props: Props) {
  const {
    open,
    selectedExam,
    classes,
    subjects,
    rows,
    onRowsChange,
    onClose,
    onAddRow,
    onSubmit,
  } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Bulk Add Schedules</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          Exam: {selectedExam ? selectedExam.name : "-"}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Max</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ minWidth: 180 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={r.class_id}
                        onChange={(e) =>
                          onRowsChange(
                            rows.map((x) =>
                              x.id === r.id
                                ? { ...x, class_id: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        <MenuItem value="">Select...</MenuItem>
                        {classes.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={r.subject_id}
                        onChange={(e) =>
                          onRowsChange(
                            rows.map((x) =>
                              x.id === r.id
                                ? { ...x, subject_id: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        <MenuItem value="">Select...</MenuItem>
                        {subjects.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <TextField
                      size="small"
                      type="date"
                      value={r.exam_date}
                      onChange={(e) =>
                        onRowsChange(
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, exam_date: e.target.value }
                              : x,
                          ),
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    <TextField
                      size="small"
                      type="time"
                      value={r.start_time}
                      onChange={(e) =>
                        onRowsChange(
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, start_time: e.target.value }
                              : x,
                          ),
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    <TextField
                      size="small"
                      type="time"
                      value={r.end_time}
                      onChange={(e) =>
                        onRowsChange(
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, end_time: e.target.value }
                              : x,
                          ),
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <TextField
                      size="small"
                      value={r.room}
                      onChange={(e) =>
                        onRowsChange(
                          rows.map((x) =>
                            x.id === r.id ? { ...x, room: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 90 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={r.max_marks}
                      onChange={(e) =>
                        onRowsChange(
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, max_marks: e.target.value }
                              : x,
                          ),
                        )
                      }
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        onRowsChange(rows.filter((x) => x.id !== r.id))
                      }
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
          <Button variant="outlined" onClick={onAddRow}>
            Add Row
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
