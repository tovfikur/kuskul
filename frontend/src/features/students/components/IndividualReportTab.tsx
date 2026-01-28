import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Autocomplete,
  TextField,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  getStudents,
  getStudentResults,
  getStudentPromotions,
  getStudentDiscipline,
  type Student,
  type StudentResult,
  type StudentPromotion,
  type StudentDiscipline,
} from "../../../api/people";

export default function IndividualReportTab() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [results, setResults] = useState<StudentResult[]>([]);
  const [promotions, setPromotions] = useState<StudentPromotion[]>([]);
  const [discipline, setDiscipline] = useState<StudentDiscipline[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent.id);
    } else {
      setResults([]);
      setPromotions([]);
      setDiscipline([]);
    }
  }, [selectedStudent]);

  async function searchStudents(query: string) {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await getStudents({ search: query, limit: 20 });
      setSearchResults(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function fetchStudentData(id: string) {
    setLoadingData(true);
    try {
      const [resResults, resPromotions, resDiscipline] = await Promise.all([
        getStudentResults(id),
        getStudentPromotions(id),
        getStudentDiscipline(id),
      ]);
      setResults(resResults);
      setPromotions(resPromotions);
      setDiscipline(resDiscipline);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Search Student
        </Typography>
        <Autocomplete
          options={searchResults}
          getOptionLabel={(option) =>
            `${option.first_name} ${option.last_name || ""} (${option.admission_no || "N/A"})`
          }
          filterOptions={(x) => x}
          onInputChange={(_, value) => searchStudents(value)}
          onChange={(_, value) => setSelectedStudent(value)}
          loading={loadingSearch}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search by name or admission no"
              variant="outlined"
              fullWidth
            />
          )}
        />
      </Box>

      {selectedStudent && (
        <Box>
          <Card elevation={0} sx={{ mb: 4, border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h5" fontWeight={700}>
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </Typography>
                  <Typography color="text.secondary">
                    Admission No: {selectedStudent.admission_no}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: "right" }}>
                  <Chip
                    label={selectedStudent.status}
                    color={selectedStudent.status === "active" ? "success" : "default"}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Paper elevation={0} sx={{ mb: 4, border: "1px solid", borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="Exam Results" />
              <Tab label="Promotions" />
              <Tab label="Discipline & Remarks" />
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {loadingData ? (
                <CircularProgress />
              ) : (
                <>
                  {activeTab === 0 && (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Exam</TableCell>
                            <TableCell>Year</TableCell>
                            <TableCell>Marks</TableCell>
                            <TableCell>Grade</TableCell>
                            <TableCell>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {results.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.exam_name}</TableCell>
                              <TableCell>{r.academic_year}</TableCell>
                              <TableCell>
                                {r.obtained_marks} / {r.total_marks} ({r.percentage}%)
                              </TableCell>
                              <TableCell>
                                {r.grade ? <Chip label={r.grade} size="small" /> : "-"}
                              </TableCell>
                              <TableCell>{r.remarks || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {results.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} align="center">
                                No results found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {activeTab === 1 && (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Year</TableCell>
                            <TableCell>Class</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {promotions.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{p.academic_year}</TableCell>
                              <TableCell>{p.class_name}</TableCell>
                              <TableCell>
                                <Chip label={p.status} size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                          {promotions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} align="center">
                                No promotion history found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {activeTab === 2 && (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Note</TableCell>
                            <TableCell>Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {discipline.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell>{d.date}</TableCell>
                              <TableCell>{d.category}</TableCell>
                              <TableCell>{d.note}</TableCell>
                              <TableCell>
                                <Chip
                                  label={d.is_positive ? "Positive" : "Negative"}
                                  color={d.is_positive ? "success" : "error"}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {discipline.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                No discipline records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
