import {
  Box,
  Button,
  Chip,
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

import type { Exam } from "../../../../api/exams";
import { statusColor } from "./examMasterUtils";

type Props = {
  exams: Exam[];
  onEdit: (e: Exam) => void;
  onPublish: (examId: string) => void;
  onDelete: (examId: string) => void;
};

export function OfflineExamMasterTable(props: Props) {
  const { exams, onEdit, onPublish, onDelete } = props;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Date Range</TableCell>
            <TableCell>Weight %</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Published</TableCell>
            <TableCell>Editable</TableCell>
            <TableCell>Entry Deadline</TableCell>
            <TableCell>Publish Date</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {exams.map((e) => (
            <TableRow key={e.id} hover>
              <TableCell>{e.name}</TableCell>
              <TableCell>{e.exam_code || "-"}</TableCell>
              <TableCell>{e.exam_type || "-"}</TableCell>
              <TableCell>
                {e.start_date || e.end_date
                  ? `${e.start_date || "-"} → ${e.end_date || "-"}`
                  : "-"}
              </TableCell>
              <TableCell>
                {e.weight_percentage != null ? e.weight_percentage : "-"}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={e.status || "draft"}
                  color={statusColor(e.status)}
                  variant={e.status === "draft" ? "outlined" : "filled"}
                />
              </TableCell>
              <TableCell>{e.is_published ? "Yes" : "No"}</TableCell>
              <TableCell>{e.is_result_editable ? "Yes" : "No"}</TableCell>
              <TableCell>{e.result_entry_deadline || "-"}</TableCell>
              <TableCell>{e.result_publish_date || "-"}</TableCell>
              <TableCell align="right">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(e)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Publish">
                  <Box component="span">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={e.is_published}
                      onClick={() => onPublish(e.id)}
                    >
                      Publish
                    </Button>
                  </Box>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(e.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {exams.length === 0 && (
            <TableRow>
              <TableCell colSpan={11}>No exams found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
