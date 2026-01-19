import { useCallback, useEffect, useMemo, useState } from "react";
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
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  IconButton,
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
  getAcademicCalendarSettings,
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
import { showToast } from "../../../app/toast";

export default function TimetableTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const effectiveClassId = selectedClassId || classes[0]?.id || "";
  const effectiveSectionId = selectedSectionId || sections[0]?.id || "";

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [calendarSettings, setCalendarSettings] = useState<{
    working_days_mask: number;
    shift: string;
  } | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogEntry, setDialogEntry] = useState<TimetableEntry | null>(null);
  const [dialogForm, setDialogForm] = useState({
    day_of_week: 0,
    time_slot_id: "",
    subject_id: "",
    staff_id: "",
    room: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setInitLoading(true);
      try {
        const [cls, subs, staff, slots, year] = await Promise.all([
          getClasses(),
          getSubjects(),
          getStaff(),
          getTimeSlots(),
          getCurrentAcademicYear(),
        ]);

        const cal = await getAcademicCalendarSettings(year.id);

        if (!active) return;

        setClasses(cls);
        setSubjects(subs);
        setStaffList(staff.items);
        setTimeSlots(slots);
        setCurrentAcademicYearId(year.id);
        setCalendarSettings({
          working_days_mask: cal.working_days_mask,
          shift: cal.shift,
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (active) {
          setInitLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSections() {
      if (!effectiveClassId) {
        setSections([]);
        setSelectedSectionId("");
        setEntries([]);
        return;
      }
      setSections([]);
      setSelectedSectionId("");
      setEntries([]);
      setSectionsLoading(true);
      try {
        const data = await getSections(effectiveClassId);
        if (!active) return;
        setSections(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setSectionsLoading(false);
      }
    }

    loadSections();

    return () => {
      active = false;
    };
  }, [effectiveClassId]);

  const loadTimetable = useCallback(async (sectionId: string) => {
    setLoading(true);
    try {
      const data = await getTimetable({ section_id: sectionId });
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (effectiveSectionId) {
      loadTimetable(effectiveSectionId);
    } else {
      setEntries([]);
    }
  }, [effectiveSectionId, loadTimetable]);

  const handleSave = async () => {
    if (!effectiveSectionId) return;
    try {
      const academicYearId =
        currentAcademicYearId || (await getCurrentAcademicYear()).id;
      if (dialogMode === "create") {
        await createTimetableEntry({
          academic_year_id: academicYearId,
          section_id: effectiveSectionId,
          day_of_week: dialogForm.day_of_week,
          time_slot_id: dialogForm.time_slot_id,
          subject_id: dialogForm.subject_id ? dialogForm.subject_id : null,
          staff_id: dialogForm.staff_id ? dialogForm.staff_id : null,
          room: dialogForm.room?.trim() ? dialogForm.room.trim() : null,
        });
      } else {
        if (!dialogEntry) return;
        await updateTimetableEntry(dialogEntry.id, {
          day_of_week: dialogForm.day_of_week,
          time_slot_id: dialogForm.time_slot_id,
          subject_id: dialogForm.subject_id ? dialogForm.subject_id : null,
          staff_id: dialogForm.staff_id ? dialogForm.staff_id : null,
          room: dialogForm.room?.trim() ? dialogForm.room.trim() : null,
        });
      }
      setDialogOpen(false);
      setDialogEntry(null);
      setDialogMode("create");
      setDialogForm({
        day_of_week: 0,
        time_slot_id: "",
        subject_id: "",
        staff_id: "",
        room: "",
      });
      loadTimetable(effectiveSectionId);
    } catch (e) {
      console.error(e);
    }
  };

  const openCreateForCell = (dayOfWeek: number, timeSlotId: string) => {
    setDialogMode("create");
    setDialogEntry(null);
    setDialogForm({
      day_of_week: dayOfWeek,
      time_slot_id: timeSlotId,
      subject_id: "",
      staff_id: "",
      room: "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setDialogMode("create");
    setDialogEntry(null);
    setDialogForm({
      day_of_week: visibleDays[0]?.index ?? 0,
      time_slot_id: visibleTimeSlots[0]?.id ?? "",
      subject_id: "",
      staff_id: "",
      room: "",
    });
    setDialogOpen(true);
  };

  const openEditForEntry = (row: TimetableEntry) => {
    setDialogMode("edit");
    setDialogEntry(row);
    setDialogForm({
      day_of_week: row.day_of_week,
      time_slot_id: row.time_slot_id,
      subject_id: row.subject_id || "",
      staff_id: row.staff_id || "",
      room: row.room || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (entry: TimetableEntry) => {
    try {
      await deleteTimetableEntry(entry.id);
      setDialogOpen(false);
      setDialogEntry(null);
      setDialogMode("create");
      if (effectiveSectionId) {
        loadTimetable(effectiveSectionId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const days = useMemo(
    () => [
      { index: 0, label: "Mon", full: "Monday" },
      { index: 1, label: "Tue", full: "Tuesday" },
      { index: 2, label: "Wed", full: "Wednesday" },
      { index: 3, label: "Thu", full: "Thursday" },
      { index: 4, label: "Fri", full: "Friday" },
      { index: 5, label: "Sat", full: "Saturday" },
      { index: 6, label: "Sun", full: "Sunday" },
    ],
    [],
  );

  const visibleDays = useMemo(() => {
    if (showAllDays) return days;
    const mask = calendarSettings?.working_days_mask ?? 31;
    return days.filter((d) => (mask & (1 << d.index)) !== 0);
  }, [calendarSettings?.working_days_mask, days, showAllDays]);

  const visibleTimeSlots = useMemo(() => {
    const active = timeSlots.filter((t) => t.is_active);
    const shift = calendarSettings?.shift;
    if (!shift) return active;
    const inShift = active.filter((t) => t.shift === shift);
    return inShift.length > 0 ? inShift : active;
  }, [calendarSettings?.shift, timeSlots]);

  const subjectById = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) map.set(s.id, s);
    return map;
  }, [subjects]);

  const staffById = useMemo(() => {
    const map = new Map<string, Staff>();
    for (const s of staffList) map.set(s.id, s);
    return map;
  }, [staffList]);

  const entriesByKey = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const e of entries) {
      map.set(`${e.day_of_week}:${e.time_slot_id}`, e);
    }
    return map;
  }, [entries]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }} disabled={initLoading}>
          <InputLabel>Class</InputLabel>
          <Select
            value={effectiveClassId}
            label="Class"
            onChange={(e) => {
              setSelectedClassId(String(e.target.value));
              setSelectedSectionId("");
            }}
          >
            {classes.length === 0 ? (
              <MenuItem disabled value="">
                No classes found
              </MenuItem>
            ) : (
              classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <FormControl
          sx={{ minWidth: 200 }}
          disabled={!effectiveClassId || initLoading || sectionsLoading}
        >
          <InputLabel>Section</InputLabel>
          <Select
            value={effectiveSectionId}
            label="Section"
            onChange={(e) => setSelectedSectionId(String(e.target.value))}
          >
            {sectionsLoading ? (
              <MenuItem disabled value="">
                Loading sections...
              </MenuItem>
            ) : sections.length === 0 ? (
              <MenuItem disabled value="">
                No sections found
              </MenuItem>
            ) : (
              sections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Box
          sx={{
            ml: "auto",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            disabled={
              initLoading ||
              sectionsLoading ||
              !effectiveSectionId ||
              visibleTimeSlots.length === 0
            }
            onClick={() => {
              if (!effectiveClassId) {
                showToast({
                  severity: "info",
                  message: "Select a class first.",
                });
                return;
              }
              if (!effectiveSectionId) {
                showToast({
                  severity: "info",
                  message: "Select a section first.",
                });
                return;
              }
              if (visibleTimeSlots.length === 0) {
                showToast({
                  severity: "warning",
                  message: "Create an active time slot first.",
                });
                return;
              }
              openCreate();
            }}
          >
            Add Entry
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={showAllDays}
                onChange={(e) => setShowAllDays(e.target.checked)}
              />
            }
            label="Show all days"
          />
        </Box>
      </Box>

      {initLoading ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">
              Loading timetable setup...
            </Typography>
          </Box>
        </Paper>
      ) : classes.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography fontWeight={800}>No classes yet</Typography>
          <Typography color="text.secondary">
            Create a class and section first, then return here to build the
            timetable.
          </Typography>
        </Paper>
      ) : !effectiveClassId ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography fontWeight={800}>Select a class</Typography>
          <Typography color="text.secondary">
            Choose a class to load its sections and view the timetable grid.
          </Typography>
        </Paper>
      ) : sectionsLoading ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">Loading sections...</Typography>
          </Box>
        </Paper>
      ) : sections.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography fontWeight={800}>No sections for this class</Typography>
          <Typography color="text.secondary">
            Create at least one section for the selected class to build a
            timetable.
          </Typography>
        </Paper>
      ) : !effectiveSectionId ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography fontWeight={800}>Select a section</Typography>
          <Typography color="text.secondary">
            Choose a section to display the timetable grid. Click any cell to
            add or edit an entry.
          </Typography>
        </Paper>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Click a cell to add or edit an entry.
          </Typography>
          {visibleDays.length === 0 ? (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography fontWeight={800}>
                No working days configured Your academic calendar working days
                are empty. Enable days in Calendar settings or toggle “Show all
                days”.
              </Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => setShowAllDays(true)}
                >
                  Show all days
                </Button>
              </Box>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 640 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 220 }}>Time</TableCell>
                    {visibleDays.map((d) => (
                      <TableCell key={d.index} align="center">
                        {d.full}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={1 + visibleDays.length}
                        align="center"
                      >
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    visibleTimeSlots.map((slot) => (
                      <TableRow key={slot.id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{slot.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {slot.start_time} - {slot.end_time}
                          </Typography>
                        </TableCell>
                        {visibleDays.map((d) => {
                          const entry = entriesByKey.get(
                            `${d.index}:${slot.id}`,
                          );
                          const subject = entry?.subject_id
                            ? subjectById.get(entry.subject_id)
                            : undefined;
                          const staff = entry?.staff_id
                            ? staffById.get(entry.staff_id)
                            : undefined;
                          const primary = subject?.name || "-";
                          const secondaryParts: string[] = [];
                          if (staff) {
                            secondaryParts.push(
                              `${staff.first_name} ${staff.last_name}`,
                            );
                          }
                          if (entry?.room) {
                            secondaryParts.push(entry.room);
                          }
                          const secondary =
                            secondaryParts.length > 0
                              ? secondaryParts.join(" • ")
                              : "";

                          return (
                            <TableCell
                              key={d.index}
                              sx={{
                                cursor: "pointer",
                                verticalAlign: "top",
                                minWidth: 180,
                                bgcolor: entry ? "action.hover" : "transparent",
                                "&:hover": {
                                  bgcolor: entry
                                    ? "action.selected"
                                    : "action.hover",
                                },
                              }}
                              onClick={() => {
                                if (entry) {
                                  openEditForEntry(entry);
                                } else {
                                  openCreateForCell(d.index, slot.id);
                                }
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 1,
                                }}
                              >
                                <Typography fontWeight={700}>
                                  {primary}
                                </Typography>
                                {entry ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 0.5,
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditForEntry(entry);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget(entry);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : null}
                              </Box>
                              {secondary ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {secondary}
                                </Typography>
                              ) : null}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  {!loading && visibleTimeSlots.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={1 + visibleDays.length}
                        sx={{ py: 3 }}
                      >
                        No active time slots found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setDialogEntry(null);
          setDialogMode("create");
        }}
      >
        <DialogTitle>
          {dialogMode === "create"
            ? "Add Timetable Entry"
            : "Edit Timetable Entry"}
        </DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Day</InputLabel>
            <Select
              value={dialogForm.day_of_week}
              label="Day"
              onChange={(e) =>
                setDialogForm({
                  ...dialogForm,
                  day_of_week: e.target.value as number,
                })
              }
            >
              {days.map((d) => (
                <MenuItem key={d.index} value={d.index}>
                  {d.full}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Time Slot</InputLabel>
            <Select
              value={dialogForm.time_slot_id}
              label="Time Slot"
              onChange={(e) =>
                setDialogForm({ ...dialogForm, time_slot_id: e.target.value })
              }
            >
              {visibleTimeSlots.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({t.start_time}-{t.end_time})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select
              value={dialogForm.subject_id}
              label="Subject"
              onChange={(e) =>
                setDialogForm({ ...dialogForm, subject_id: e.target.value })
              }
            >
              <MenuItem value="">(None)</MenuItem>
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
              value={dialogForm.staff_id}
              label="Teacher"
              onChange={(e) =>
                setDialogForm({ ...dialogForm, staff_id: e.target.value })
              }
            >
              <MenuItem value="">(None)</MenuItem>
              {staffList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Room"
            value={dialogForm.room}
            onChange={(e) =>
              setDialogForm({
                ...dialogForm,
                room: e.target.value,
              })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setDialogEntry(null);
              setDialogMode("create");
            }}
          >
            Cancel
          </Button>
          {dialogMode === "edit" ? (
            <Button
              color="error"
              onClick={() => {
                if (dialogEntry) setDeleteTarget(dialogEntry);
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button onClick={handleSave} variant="contained">
            {dialogMode === "create" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete timetable entry</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this timetable entry?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!deleteTarget) return;
              const target = deleteTarget;
              setDeleteTarget(null);
              handleDelete(target);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
