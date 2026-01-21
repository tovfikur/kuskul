import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  TextField,
  Avatar,
  InputAdornment,
  CircularProgress,
  Tooltip
} from "@mui/material";
import { 
  CheckCircle, 
  AccessTime, 
  Search, 
  CloudDownload,
  DateRange 
} from "@mui/icons-material";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { listStaff, getStaffAttendanceByDate, markStaffAttendance, listDesignations } from "../../../../api/staffManagement";
import type { Staff, StaffAttendance, Designation } from "../../../../api/staffManagement";

// Mock Data for chart colors
const COLORS = ['#4caf50', '#f44336', '#ff9800', '#e0e0e0'];

export default function AttendanceTab() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, StaffAttendance>>({}); // staff_id -> record
  const [designations, setDesignations] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all staff
      const staffRes = await listStaff({ limit: 1000, status: "active" });
      if ((staffRes as any).error) { 
         if ((staffRes as any).error.status === 401) throw new Error("Unauthorized");
      }
      
      // Use .items based on API structure
      if ((staffRes as any).data && (staffRes as any).data.items) { 
        setStaffList((staffRes as any).data.items || []);
      }

      // 2. Fetch designations
      const desRes = await listDesignations({ limit: 100 });
      if ((desRes as any).data && (desRes as any).data.items) {
        const map: Record<string, string> = {};
        (desRes as any).data.items.forEach((d: Designation) => {
          map[d.id] = d.title;
        });
        setDesignations(map);
      }

      // 3. Fetch attendance for date
      const attendanceRes = await getStaffAttendanceByDate(date);
      const attData = (attendanceRes as any).data;
      if (attData && Array.isArray(attData)) {
        const mapping: Record<string, StaffAttendance> = {};
        attData.forEach((r: StaffAttendance) => {
          mapping[r.staff_id] = r;
        });
        setAttendanceMap(mapping);
      } else if ((attendanceRes as any).error?.status === 401) {
        throw new Error("Unauthorized");
      }

    } catch (err: any) {
      console.error("Failed to fetch attendance data", err);
      if (err.message === "Unauthorized" || err?.response?.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  // Derived State
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => 
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, unmarked = 0;
    staffList.forEach(s => {
      const record = attendanceMap[s.id];
      if (!record) {
        unmarked++;
      } else if (record.status === "present") {
        present++;
      } else if (record.status === "absent") {
        absent++;
      } else if (record.status === "late") {
        late++;
      } else {
        unmarked++; // Default fallback
      }
    }); 
    return { present, absent, late, unmarked, total: staffList.length };
  }, [staffList, attendanceMap]);

  const chartData = [
    { name: 'Present', value: stats.present },
    { name: 'Absent', value: stats.absent },
    { name: 'Late', value: stats.late },
    { name: 'Unmarked', value: stats.unmarked },
  ];

  // Actions
  const handleStatusChange = async (staffId: string, newStatus: string) => {
    // Optimistic update
    const newRecord: any = {
      ...attendanceMap[staffId],
      staff_id: staffId,
      status: newStatus,
      attendance_date: date
    };
    setAttendanceMap(prev => ({ ...prev, [staffId]: newRecord }));

    // API Call
    try {
      await markStaffAttendance({
        attendance_date: date,
        items: [{ staff_id: staffId, status: newStatus }]
      });
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert optional?
    }
  };

  const handleMarkAllPresent = async () => {
    if (!confirm("Mark all unmarked staff as Present?")) return;
    setSaving(true);
    const itemsToMark = staffList
      .filter(s => !attendanceMap[s.id])
      .map(s => ({ staff_id: s.id, status: "present" }));
    
    if (itemsToMark.length === 0) {
      setSaving(false);
      return;
    }

    try {
      await markStaffAttendance({
        attendance_date: date,
        items: itemsToMark
      });
      fetchData(); // Refresh to ensure sync
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="h6" color="error" gutterBottom>{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>Reload Page</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 180px)", gap: 3, pt: 1 }}>
      
      {/* Left Panel: Overview (38.2%) */}
      <Paper sx={{ 
        width: "38.2%", 
        borderRadius: 3, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: "#fff"
      }} elevation={2}>
        
        {/* Header */}
        <Box sx={{ p: 3, background: "linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)", color: "white" }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Attendance Overview</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Daily summary and statistics</Typography>
          
          {/* Date Picker Custom Style */}
          <Box sx={{ mt: 3, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, p: 2 }}>
             <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "white" }}>
                <DateRange fontSize="small" />
                <Typography variant="body2" fontWeight={500}>Select Date</Typography>
             </Box>
             <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                style={{ 
                  width: "100%", 
                  background: "transparent", 
                  border: "none", 
                  color: "white", 
                  fontSize: "1.1rem", 
                  marginTop: "8px",
                  fontWeight: 600,
                  outline: "none"
                }} 
              />
          </Box>
        </Box>

        {/* Chart Section */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", p: 2, minHeight: 300, minWidth: 0 }}>
            {/* Recharts Container with Strict Height */}
            <Box sx={{ width: "100%", height: 280, minWidth: 250 }}> 
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer> 
            </Box>
            
            {/* Center Text */}
            <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", textAlign: "center", pointerEvents: "none" }}>
              <Typography variant="h4" fontWeight={700} color="primary">{stats.present}</Typography>
              <Typography variant="caption" color="text.secondary">Present</Typography>
            </Box>
        </Box>

        {/* Simple Stats Grid */}
        <Box sx={{ p: 3, borderTop: "1px solid #f0f0f0" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
               <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#e8f5e9", borderRadius: 2 }}>
                 <Typography variant="h6" color="success.main" fontWeight={700}>{stats.present}</Typography>
                 <Typography variant="caption" color="text.secondary">Present</Typography>
               </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
               <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#ffebee", borderRadius: 2 }}>
                 <Typography variant="h6" color="error.main" fontWeight={700}>{stats.absent}</Typography>
                 <Typography variant="caption" color="text.secondary">Absent</Typography>
               </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
               <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#fff3e0", borderRadius: 2 }}>
                 <Typography variant="h6" color="warning.main" fontWeight={700}>{stats.late}</Typography>
                 <Typography variant="caption" color="text.secondary">Late</Typography>
               </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Right Panel: Staff List (61.8%) */}
      <Paper sx={{ 
        width: "61.8%", 
        borderRadius: 3, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: "#fff"
      }} elevation={2}>
        
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
              size="small"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
          />
          <Tooltip title="Mark all unmarked as Present">
            <Button 
              variant="outlined" 
              startIcon={<CheckCircle />} 
              onClick={handleMarkAllPresent} 
              disabled={saving}
            >
              Mark All
            </Button>
          </Tooltip>
          <Button startIcon={<CloudDownload />}>
            Export
          </Button>
        </Box>

        {/* List Content */}
        <Box sx={{ flex: 1, overflow: "auto", p: 0 }}>
           {loading ? (
             <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress />
             </Box>
           ) : filteredStaff.length === 0 ? (
             <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                No staff members found.
             </Box>
           ) : (
             <Box>
               {filteredStaff.map((staff) => {
                 const record = attendanceMap[staff.id];
                 const status = (record?.status || "unmarked") as string;
                 const desName = designations[staff.designation_id || ""] || staff.designation_id || "Staff"; // Use designation map

                 return (
                   <Box key={staff.id} sx={{ 
                     display: "flex", 
                     alignItems: "center", 
                     p: 2, 
                     borderBottom: "1px solid #f5f5f5",
                     "&:hover": { bgcolor: "#f8fafc" }
                   }}>
                     {/* Avatar & Info */}
                     <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                        <Avatar src={staff.profile_photo_url} sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}>
                          {staff.first_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{staff.first_name} {staff.last_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{desName}</Typography>
                        </Box>
                     </Box>

                     {/* Times */}
                     <Box sx={{ gap: 2, mr: 3, display: { xs: "none", md: "flex" } }}>
                        {status !== "unmarked" && status !== "absent" && (
                          <Chip 
                            icon={<AccessTime fontSize="small"/>} 
                            label={record?.check_in_at ? new Date(record.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--"} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                     </Box>

                     {/* Status Actions */}
                     <Box sx={{ display: "flex", gap: 0.5 }}>
                        <StatusButton 
                          current={status} 
                          target="present" 
                          label="P" 
                          color="success" 
                          onClick={() => handleStatusChange(staff.id, "present")} 
                        />
                         <StatusButton 
                          current={status} 
                          target="late" 
                          label="L" 
                          color="warning" 
                          onClick={() => handleStatusChange(staff.id, "late")} 
                        />
                         <StatusButton 
                          current={status} 
                          target="absent" 
                          label="A" 
                          color="error" 
                          onClick={() => handleStatusChange(staff.id, "absent")} 
                        />
                     </Box>
                   </Box>
                 );
               })}
             </Box>
           )}
        </Box>
      </Paper>
    </Box>
  );
}

// Small helper component
function StatusButton({ current, target, label, color, onClick }: any) {
  const active = current === target;
  return (
    <Button 
      size="small" 
      sx={{ 
        minWidth: 32, 
        width: 32, 
        height: 32, 
        p: 0, 
        borderRadius: "50%",
        bgcolor: active ? `${color}.main` : "transparent",
        color: active ? "white" : "text.secondary",
        border: active ? "none" : "1px solid #e0e0e0",
        "&:hover": { bgcolor: active ? `${color}.dark` : "#f5f5f5" }
      }}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
