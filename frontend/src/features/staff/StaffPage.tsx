import { useState } from "react";
import StaffLayout from "./components/StaffLayout";
import DirectoryTab from "./components/directory/DirectoryTab";
import AttendanceTab from "./components/attendance/AttendanceTab";
import LeaveTab from "./components/leave/LeaveTab";
import { PayrollTab } from "./components/payroll/PayrollTab";
import PerformanceTab from "./components/performance/PerformanceTab";
import DocumentsTab from "./components/documents/DocumentsTab";
import SettingsTab from "./components/settings/SettingsTab";

type StaffTab =
  | "directory"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance"
  | "documents"
  | "settings";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<StaffTab>("directory");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "directory":
        return "Staff Directory";
      case "attendance":
        return "Attendance Tracking";
      case "leave":
        return "Leave Management";
      case "payroll":
        return "Payroll Management";
      case "performance":
        return "Performance Reviews";
      case "documents":
        return "Documents & Contracts";
      case "settings":
        return "Staff Settings";
      default:
        return "Staff Management";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "directory":
        return <DirectoryTab />;
      case "attendance":
        return <AttendanceTab />;
      case "leave":
        return <LeaveTab />;
      case "payroll":
        return <PayrollTab />;
      case "performance":
        return <PerformanceTab />;
      case "documents":
        return <DocumentsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <DirectoryTab />;
    }
  };

  return (
    <StaffLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={getHeaderTitle()}
    >
      {renderTabContent()}
    </StaffLayout>
  );
}
