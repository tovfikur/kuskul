import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import type { Lookups, ScheduleRow } from "./types";
import { formatTimeRange } from "./scheduleUtils";

type Props = {
  rows: ScheduleRow[];
  lookups: Lookups;
  loading: boolean;
  onEdit: (row: ScheduleRow) => void;
  onDelete: (id: string) => void;
};

export function OfflineSchedulesTable(props: Props) {
  const { rows, lookups, loading, onEdit, onDelete } = props;
  const { examById, classById, subjectById } = lookups;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Exam</TableCell>
            <TableCell>Class</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Room</TableCell>
            <TableCell>Max Marks</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell>{examById.get(s.exam_id)?.name ?? s.exam_id}</TableCell>
              <TableCell>{classById.get(s.class_id)?.name ?? s.class_id}</TableCell>
              <TableCell>
                {subjectById.get(s.subject_id)?.name ?? s.subject_id}
              </TableCell>
              <TableCell>{s.exam_date}</TableCell>
              <TableCell>{formatTimeRange(s.start_time, s.end_time)}</TableCell>
              <TableCell>{s.room ?? "-"}</TableCell>
              <TableCell>{s.max_marks}</TableCell>
              <TableCell align="right">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(s)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(s.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>No schedules found.</TableCell>
            </TableRow>
          )}
          {loading && (
            <TableRow>
              <TableCell colSpan={8}>Loading...</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

