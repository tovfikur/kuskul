import { useState } from "react";
import StudentsLayout from "./components/StudentsLayout";
import StudentsDirectoryTab from "./StudentsDirectoryTab";
import AdmissionsTab from "./components/AdmissionsTab";
import ReportsTab from "./components/ReportsTab";
import SettingsTab from "./components/SettingsTab";

type StudentsTab = "directory" | "admissions" | "reports" | "settings";

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<StudentsTab>("directory");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "directory":
        return "Student Directory";
      case "admissions":
        return "Admissions";
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
