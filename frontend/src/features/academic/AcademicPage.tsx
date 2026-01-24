import { useState } from "react";
import AcademicLayout from "./components/AcademicLayout";
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

type AcademicTab =
  | "years"
  | "terms"
  | "streams"
  | "classes"
  | "subjectGroups"
  | "subjects"
  | "teacherMapping"
  | "timeSlots"
  | "timetable"
  | "grades"
  | "curriculum"
  | "calendar";

export default function AcademicPage() {
  const [activeTab, setActiveTab] = useState<AcademicTab>("years");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "years":
        return "Academic Years";
      case "terms":
        return "Terms / Semesters";
      case "streams":
        return "Streams";
      case "classes":
        return "Classes & Sections";
      case "subjectGroups":
        return "Subject Groups";
      case "subjects":
        return "Subjects";
      case "teacherMapping":
        return "Class-Subject-Teacher";
      case "timeSlots":
        return "Period Structure";
      case "timetable":
        return "Timetable";
      case "grades":
        return "Grading";
      case "curriculum":
        return "Curriculum";
      case "calendar":
        return "Calendar";
      default:
        return "Academic Management";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "years":
        return <YearsTab />;
      case "terms":
        return <TermsTab />;
      case "streams":
        return <StreamsTab />;
      case "classes":
        return <ClassesTab />;
      case "subjectGroups":
        return <SubjectGroupsTab />;
      case "subjects":
        return <SubjectsTab />;
      case "teacherMapping":
        return <TeacherMappingTab />;
      case "timeSlots":
        return <TimeSlotsTab />;
      case "timetable":
        return <TimetableTab />;
      case "grades":
        return <GradesTab />;
      case "curriculum":
        return <CurriculumTab />;
      case "calendar":
        return <CalendarTab />;
      default:
        return <YearsTab />;
    }
  };

  return (
    <AcademicLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={getHeaderTitle()}
    >
      {renderTabContent()}
    </AcademicLayout>
  );
}
