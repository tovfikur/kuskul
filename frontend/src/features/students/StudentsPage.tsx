import { useState } from "react";
import StudentsLayout from "./components/StudentsLayout";
import StudentsDirectoryTab from "./StudentsDirectoryTab";
import AdmissionsTab from "./components/AdmissionsTab";
import AttendanceTab from "./components/AttendanceTab";
import TodayAttendanceTab from "./components/TodayAttendanceTab";
import AttendanceSettingsTab from "./components/AttendanceSettingsTab";
import ReportsTab from "./components/ReportsTab";
import SettingsTab from "./components/SettingsTab";

type StudentsTab =
  | "directory"
  | "admissions"
  | "attendance"
  | "today-attendance"
  | "attendance-settings"
  | "reports"
  | "settings";

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<StudentsTab>("directory");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "directory":
        return "Student Directory";
      case "admissions":
        return "Admissions";
      case "attendance":
        return "Attendance";
      case "today-attendance":
        return "Today Attendance";
      case "attendance-settings":
        return "Attendance Settings";
      case "reports":
        return "Reports";
      case "settings":
        return "Settings";
      default:
        return "Student Management";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "directory":
        return <StudentsDirectoryTab />;
      case "admissions":
        return <AdmissionsTab />;
      case "attendance":
        return <AttendanceTab />;
      case "today-attendance":
        return <TodayAttendanceTab />;
      case "attendance-settings":
        return <AttendanceSettingsTab />;
      case "reports":
        return <ReportsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <StudentsDirectoryTab />;
    }
  };

  return (
    <StudentsLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={getHeaderTitle()}
    >
      {renderTabContent()}
    </StudentsLayout>
  );
}
