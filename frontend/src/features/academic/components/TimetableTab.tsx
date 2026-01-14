import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getClasses,
  getSections,
  getSubjects,
  getTimeSlots,
  getTimetable,
  getCurrentAcademicYear,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  type SchoolClass,
  type Section,
  type Subject,
  type TimeSlot,
  type TimetableEntry,
} from "../../../api/academic";
import { getStaff, type Staff } from "../../../api/people";

export default function TimetableTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Create Entry State
  const [openCreate, setOpenCreate] = useState(false);
  const [entryForm, setEntryForm] = useState({
    day_of_week: 0,
    time_slot_id: "",
    subject_id: "",
    staff_id: "",
  });
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimetableEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({
    day_of_week: 0,
    time_slot_id: "",
    subject_id: "",
    staff_id: "",
  });

  useEffect(() => {
    getClasses().then(setClasses);
    getSubjects().then(setSubjects);
    getStaff().then((r) => setStaffList(r.items));
    getTimeSlots().then(setTimeSlots);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      getSections(selectedClassId).then(setSections);
    } else {
      setSections([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadTimetable();
    } else {
      setEntries([]);
    }
  }, [selectedSectionId]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      // Assuming getTimetable accepts section_id query param
      // I defined getTimetable(params) in api/academic.ts
      const data = await getTimetable({ section_id: selectedSectionId });
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedSectionId) return;
    try {
      const year = await getCurrentAcademicYear();
      await createTimetableEntry({
        academic_year_id: year.id,
        section_id: selectedSectionId,
        day_of_week: entryForm.day_of_week,
        time_slot_id: entryForm.time_slot_id,
        subject_id: entryForm.subject_id ? entryForm.subject_id : null,
        staff_id: entryForm.staff_id ? entryForm.staff_id : null,
      });
      setOpenCreate(false);
      loadTimetable();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (row: TimetableEntry) => {
    setEditEntry(row);
    setEditEntryForm({
      day_of_week: row.day_of_week,
      time_slot_id: row.time_slot_id,
      subject_id: row.subject_id || "",
      staff_id: row.staff_id || "",
    });
  };

  const handleUpdate = async () => {
    if (!editEntry) return;
    try {
      await updateTimetableEntry(editEntry.id, {
        day_of_week: editEntryForm.day_of_week,
        time_slot_id: editEntryForm.time_slot_id,
        subject_id: editEntryForm.subject_id ? editEntryForm.subject_id : null,
        staff_id: editEntryForm.staff_id ? editEntryForm.staff_id : null,
      });
      setEditEntry(null);
      setEditEntryForm({
        day_of_week: 0,
        time_slot_id: "",
        subject_id: "",
        staff_id: "",
      });
      loadTimetable();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteEntry) return;
    try {
      await deleteTimetableEntry(deleteEntry.id);
      setDeleteEntry(null);
      loadTimetable();
    } catch (e) {
      console.error(e);
    }
  };

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Class</InputLabel>
          <Select
            value={selectedClassId}
            label="Class"
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }} disabled={!selectedClassId}>
          <InputLabel>Section</InputLabel>
          <Select
            value={selectedSectionId}
            label="Section"
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            {sections.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedSectionId && (
        <>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={() => setOpenCreate(true)}>
              Add Entry
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  entries.map((row) => {
                    const slot = timeSlots.find(
                      (t) => t.id === row.time_slot_id
                    );
                    const sub = subjects.find((s) => s.id === row.subject_id);
                    const st = staffList.find((s) => s.id === row.staff_id);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{days[row.day_of_week]}</TableCell>
                        <TableCell>
                          {slot ? `${slot.start_time} - ${slot.end_time}` : "-"}
                        </TableCell>
                        <TableCell>{sub?.name || "-"}</TableCell>
                        <TableCell>
                          {st ? `${st.first_name} ${st.last_name}` : "-"}
                        </TableCell>
                        <TableCell>{row.room || "-"}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<EditIcon fontSize="small" />}
                            onClick={() => handleOpenEdit(row)}
                            sx={{ mr: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon fontSize="small" />}
                            onClick={() => setDeleteEntry(row)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {!loading && entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No timetable entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Add Timetable Entry</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Day</InputLabel>
            <Select
              value={entryForm.day_of_week}
              label="Day"
              onChange={(e) =>
                setEntryForm({
                  ...entryForm,
                  day_of_week: e.target.value as number,
                })
              }
            >
              {days.map((d, i) => (
                <MenuItem key={i} value={i}>
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Time Slot</InputLabel>
            <Select
              value={entryForm.time_slot_id}
              label="Time Slot"
              onChange={(e) =>
                setEntryForm({ ...entryForm, time_slot_id: e.target.value })
              }
            >
              {timeSlots.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({t.start_time}-{t.end_time})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select
              value={entryForm.subject_id}
              label="Subject"
              onChange={(e) =>
                setEntryForm({ ...entryForm, subject_id: e.target.value })
              }
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Teacher</InputLabel>
            <Select
              value={entryForm.staff_id}
              label="Teacher"
              onChange={(e) =>
                setEntryForm({ ...entryForm, staff_id: e.target.value })
              }
            >
              {staffList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editEntry}
        onClose={() => {
          setEditEntry(null);
          setEditEntryForm({
            day_of_week: 0,
            time_slot_id: "",
            subject_id: "",
            staff_id: "",
          });
        }}
      >
        <DialogTitle>Edit Timetable Entry</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Day</InputLabel>
            <Select
              value={editEntryForm.day_of_week}
              label="Day"
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  day_of_week: e.target.value as number,
                })
              }
            >
              {days.map((d, i) => (
                <MenuItem key={i} value={i}>
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Time Slot</InputLabel>
            <Select
              value={editEntryForm.time_slot_id}
              label="Time Slot"
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  time_slot_id: e.target.value,
                })
              }
            >
              {timeSlots.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({t.start_time}-{t.end_time})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select
              value={editEntryForm.subject_id}
              label="Subject"
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  subject_id: e.target.value,
                })
              }
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Teacher</InputLabel>
            <Select
              value={editEntryForm.staff_id}
              label="Teacher"
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  staff_id: e.target.value,
                })
              }
            >
              {staffList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditEntry(null);
              setEditEntryForm({
                day_of_week: 0,
                time_slot_id: "",
                subject_id: "",
                staff_id: "",
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Timetable Entry</DialogTitle>
        <DialogContent>
          <Box>Are you sure you want to delete this entry?</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEntry(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
