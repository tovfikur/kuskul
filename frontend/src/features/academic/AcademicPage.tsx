import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import YearsTab from "./components/YearsTab";
import TermsTab from "./components/TermsTab";
import StreamsTab from "./components/StreamsTab";
import ClassesTab from "./components/ClassesTab";
import SubjectGroupsTab from "./components/SubjectGroupsTab";
import SubjectsTab from "./components/SubjectsTab";
import TeacherMappingTab from "./components/TeacherMappingTab";
import TimeSlotsTab from "./components/TimeSlotsTab";
import TimetableTab from "./components/TimetableTab";
import GradesTab from "./components/GradesTab";
import CurriculumTab from "./components/CurriculumTab";
import CalendarTab from "./components/CalendarTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function AcademicPage() {
  const [value, setValue] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const modules = [
    { label: "Academic Years", view: <YearsTab /> },
    { label: "Terms / Semesters", view: <TermsTab /> },
    { label: "Streams", view: <StreamsTab /> },
    { label: "Classes & Sections", view: <ClassesTab /> },
    { label: "Subject Groups", view: <SubjectGroupsTab /> },
    { label: "Subjects", view: <SubjectsTab /> },
    { label: "Class-Subject-Teacher", view: <TeacherMappingTab /> },
    { label: "Period Structure", view: <TimeSlotsTab /> },
    { label: "Timetable", view: <TimetableTab /> },
    { label: "Grading", view: <GradesTab /> },
    { label: "Curriculum", view: <CurriculumTab /> },
    { label: "Calendar", view: <CalendarTab /> },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Academic Management
          </Typography>
          <Typography color="text.secondary">
            Configure academic structure per year: years, terms, classes,
            subjects, mapping, timetable, grading.
          </Typography>
        </Box>

        {isMobile && (
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Module</InputLabel>
            <Select
              value={value}
              label="Module"
              onChange={(e) => setValue(e.target.value as number)}
            >
              {modules.map((m, idx) => (
                <MenuItem key={m.label} value={idx}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {!isMobile && (
          <Paper
            sx={{
              width: 280,
              flexShrink: 0,
              borderRadius: 3,
              position: "sticky",
              top: 16,
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Modules
              </Typography>
            </Box>
            <List aria-label="Academic modules" sx={{ p: 0 }}>
              {modules.map((m, idx) => (
                <ListItemButton
                  key={m.label}
                  selected={value === idx}
                  onClick={() => setValue(idx)}
                >
                  <ListItemText
                    primary={m.label}
                    primaryTypographyProps={{
                      fontWeight: value === idx ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        <Paper
          aria-label="Academic content"
          sx={{ flex: 1, minWidth: 0, borderRadius: 3, p: { xs: 2, md: 3 } }}
        >
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 800, mb: 2 }}
          >
            {modules[value]?.label}
          </Typography>
          <CustomTabPanel value={value} index={value}>
            {modules[value]?.view}
          </CustomTabPanel>
        </Paper>
      </Box>
    </Box>
  );
}
