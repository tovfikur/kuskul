import "./App.css";
import { Route, Routes } from "react-router-dom";

import { LoginPage } from "./features/auth/LoginPage";
import { RequireAuth } from "./features/auth/RequireAuth";
import DashboardPage from "./pages/DashboardPage";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import AcademicPage from "./features/academic/AcademicPage";
import StudentsPage from "./features/students/StudentsPage";
import StaffPage from "./features/staff/StaffPage";
import ExamsPage from "./features/exams/ExamsPage";
import EventsPage from "./features/events/EventsPage";
import FinancePage from "./features/finance/FinancePage";
import LogisticsPage from "./features/logistics/LogisticsPage";
import SettingsPage from "./features/settings/SettingsPage";
import SystemUsersPage from "./features/settings/SystemUsersPage";

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/academic" element={<AcademicPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/logistics" element={<LogisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/users" element={<SystemUsersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
