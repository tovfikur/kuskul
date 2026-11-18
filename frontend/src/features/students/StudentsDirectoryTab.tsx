import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Autocomplete,
  Avatar,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  Menu,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Download,
  FileDownload,
  MoreVert,
  Refresh,
  Search,
  UploadFile,
} from "@mui/icons-material";
import {
  getClasses,
  getCurrentAcademicYear,
  getSections,
  type AcademicYear,
  type SchoolClass,
  type Section,
} from "../../api/academic";
import {
  bulkImportStudentsCsv,
  createGuardian,
  createEnrollment,
  createStudent,
  deleteStudent,
  downloadStudentIdCard,
  downloadStudentImportTemplate,
  exportStudentsCsv,
  getEnrollmentsByStudents,
  getNextEnrollmentRollNumber,
  getStudent,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentDocuments,
  getStudentFeeDues,
  getStudentFeePayments,
  getStudentTimetable,
  getStudents,
  linkGuardianToStudent,
  uploadGuardianPhoto,
  uploadStudentDocument,
  uploadStudentPhoto,
  updateEnrollment,
  updateStudent,
  type Enrollment,
  type FeeDue,
  type FeePayment,
  type Student,
  type StudentAttendanceRecord,
  type StudentDocument,
  type StudentTimetableEntry,
  getStudentGuardians,
  getGuardians,
  type Guardian,
  type GuardianWithRelation,
  updateGuardian,
} from "../../api/people";
import { api } from "../../api/client";
import { downloadDocument } from "../../api/documents";
import { showToast } from "../../app/toast";

const getFileUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  if (path.startsWith("static/")) return `/${path}`;
  return `/static/${path}`;
};

function getFileNameFromUrl(url?: string | null) {
  if (!url) return "";
  return url.split("/").filter(Boolean).pop() || url;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openUrlInNewTab(url?: string | null) {
  if (!url) return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    showToast({ severity: "error", message: "Please allow popups to view this file" });
  }
}

function openSelectedFile(file: File | null) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    showToast({ severity: "error", message: "Please allow popups to view this file" });
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatStudentName(s: Student) {
  return [s.first_name, s.last_name || ""].filter(Boolean).join(" ").trim();
}

function statusChipColor(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "inactive") return "default";
  if (s === "suspended") return "warning";
  if (s === "alumni") return "info";
  return "default";
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type StudentDialogSettings = {
  medium_configuration: string[];
  shift_configuration: string[];
};

const defaultStudentDialogSettings: StudentDialogSettings = {
  medium_configuration: ["Bangla", "English"],
  shift_configuration: ["Morning", "Day"],
};

function nullIfBlank(v: string) {
  const t = v.trim();
  return t ? t : null;
}

function defaultStudentPortalUsername(admissionNo: string) {
  return admissionNo.trim();
}

function defaultParentPortalUsername(admissionNo: string) {
  const base = admissionNo.trim();
  return base ? `${base}parent` : "";
}

function defaultParentPortalEmail(admissionNo: string) {
  const base = defaultParentPortalUsername(admissionNo);
  return base ? `${base}@guardian.example.com` : "";
}

const emptyStudentForm = {
  first_name: "",
  last_name: "",
  admission_no: "",
  gender: "",
  date_of_birth: "",
  full_name_bc: "",
  place_of_birth: "",
  nationality: "",
  religion: "",
  blood_group: "",
  admission_date: "",
  admission_status: "pending",
  medium: "",
  shift: "",
  previous_school_name: "",
  previous_class: "",
  transfer_certificate_no: "",
  present_address: "",
  permanent_address: "",
  city: "",
  thana: "",
  postal_code: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  known_allergies: "",
  chronic_illness: "",
  physical_disabilities: "",
  special_needs: "",
  doctor_name: "",
  doctor_phone: "",
  vaccination_status: "",
  birth_certificate_no: "",
  national_id_no: "",
  passport_no: "",
  fee_category: "",
  scholarship_type: "",
  portal_username: "",
  portal_access_student: false,
  portal_access_parent: false,
  remarks: "",
  rfid_nfc_no: "",
  hostel_status: "",
  library_card_no: "",
  photo_url: "",
  status: "active",
};

const emptyEnrollmentForm = { class_id: "", section_id: "", roll_number: "" };

const emptyFatherForm = {
  id: "",
  full_name: "",
  occupation: "",
  phone: "",
  email: "",
  id_number: "",
  photo_url: "",
};

const emptyMotherForm = {
  id: "",
  full_name: "",
  occupation: "",
  phone: "",
  email: "",
  id_number: "",
  photo_url: "",
};

const emptyGuardianForm = {
  id: "",
  full_name: "",
  relation: "guardian",
  phone: "",
  email: "",
  occupation: "",
  id_number: "",
  address: "",
  photo_url: "",
};

export default function StudentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sectionsByClassIdRef = useRef<Record<string, Section[]>>({});

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollmentByStudentId, setEnrollmentByStudentId] = useState<
    Record<string, Enrollment>
  >({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentDialogSettings, setStudentDialogSettings] =
    useState<StudentDialogSettings>(defaultStudentDialogSettings);

  const [currentAcademicYear, setCurrentAcademicYear] =
    useState<AcademicYear | null>(null);
  const [sectionsByClassId, setSectionsByClassId] = useState<
    Record<string, Section[]>
  >({});

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null);
  const [actionsStudent, setActionsStudent] = useState<Student | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogTab, setDialogTab] = useState(0);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    first_name: string;
    last_name: string;
    admission_no: string;
    gender: string;
    date_of_birth: string;
    full_name_bc: string;
    place_of_birth: string;
    nationality: string;
    religion: string;
    blood_group: string;
    admission_date: string;
    admission_status: string;
    medium: string;
    shift: string;
    previous_school_name: string;
    previous_class: string;
    transfer_certificate_no: string;
    present_address: string;
    permanent_address: string;
    city: string;
    thana: string;
    postal_code: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    known_allergies: string;
    chronic_illness: string;
    physical_disabilities: string;
    special_needs: string;
    doctor_name: string;
    doctor_phone: string;
    vaccination_status: string;
    birth_certificate_no: string;
    national_id_no: string;
    passport_no: string;
    fee_category: string;
    scholarship_type: string;
    portal_username: string;
    portal_access_student: boolean;
    portal_access_parent: boolean;
    remarks: string;
    rfid_nfc_no: string;
    hostel_status: string;
    library_card_no: string;
    photo_url: string;
    status: string;
  }>({ ...emptyStudentForm });
  const [enrollmentForm, setEnrollmentForm] = useState<{
    class_id: string;
    section_id: string;
    roll_number: string;
  }>({ ...emptyEnrollmentForm });
  const [initialEnrollmentForm, setInitialEnrollmentForm] = useState<{
    class_id: string;
    section_id: string;
    roll_number: string;
  } | null>(null);
  const [rollNumberLoading, setRollNumberLoading] = useState(false);
  const rollNumberManualRef = useRef(false);

  const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null);
  const [studentPhotoPreviewUrl, setStudentPhotoPreviewUrl] = useState("");
  const [previousTcFile, setPreviousTcFile] = useState<File | null>(null);
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null);
  const [savedTransferCertificate, setSavedTransferCertificate] =
    useState<StudentDocument | null>(null);
  const [savedBirthCertificate, setSavedBirthCertificate] =
    useState<StudentDocument | null>(null);

  const [fatherForm, setFatherForm] = useState<{
    id?: string;
    full_name: string;
    occupation: string;
    phone: string;
    email: string;
    id_number: string;
    photo_url: string;
  }>({ ...emptyFatherForm });
  const [motherForm, setMotherForm] = useState<{
    id?: string;
    full_name: string;
    occupation: string;
    phone: string;
    email: string;
    id_number: string;
    photo_url: string;
  }>({ ...emptyMotherForm });
  const [guardianForm, setGuardianForm] = useState<{
    id?: string;
    full_name: string;
    relation: string;
    phone: string;
    email: string;
    occupation: string;
    id_number: string;
    address: string;
    photo_url: string;
  }>({ ...emptyGuardianForm });
  const [fatherPhotoFile, setFatherPhotoFile] = useState<File | null>(null);
  const [fatherPhotoPreviewUrl, setFatherPhotoPreviewUrl] = useState("");
  const [motherPhotoFile, setMotherPhotoFile] = useState<File | null>(null);
  const [motherPhotoPreviewUrl, setMotherPhotoPreviewUrl] = useState("");
  const [guardianPhotoFile, setGuardianPhotoFile] = useState<File | null>(null);
  const [guardianPhotoPreviewUrl, setGuardianPhotoPreviewUrl] = useState("");

  const [guardianSearchOpen, setGuardianSearchOpen] = useState(false);
  const [guardianOptions, setGuardianOptions] = useState<Guardian[]>([]);
  const [guardianSearchInput, setGuardianSearchInput] = useState("");
  const guardianLoading = guardianSearchOpen && guardianOptions.length === 0;
  const autoPortalUsernameRef = useRef<string>("");
  const autoParentEmailRef = useRef<string>("");

  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!guardianSearchOpen) return undefined;

    const timer = setTimeout(() => {
      (async () => {
        try {
          const { items } = await getGuardians({
            limit: 50,
            search: guardianSearchInput || undefined,
          });
          if (active) setGuardianOptions(items);
        } catch (e) {
          console.error(e);
        }
      })();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [guardianSearchOpen, guardianSearchInput]);

  useEffect(() => {
    if (!form.portal_access_parent) return;
    const nextAutoEmail = defaultParentPortalEmail(form.admission_no);
    if (
      nextAutoEmail &&
      (!guardianForm.email || guardianForm.email === autoParentEmailRef.current)
    ) {
      setGuardianForm((p) => ({ ...p, email: nextAutoEmail }));
    }
    autoParentEmailRef.current = nextAutoEmail;
  }, [form.admission_no, form.portal_access_parent, guardianForm.email]);

  useEffect(() => {
    if (!studentPhotoFile) {
      setStudentPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(studentPhotoFile);
    setStudentPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [studentPhotoFile]);

  useEffect(() => {
    if (!fatherPhotoFile) {
      setFatherPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(fatherPhotoFile);
    setFatherPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fatherPhotoFile]);

  useEffect(() => {
    if (!motherPhotoFile) {
      setMotherPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(motherPhotoFile);
    setMotherPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [motherPhotoFile]);

  useEffect(() => {
    if (!guardianPhotoFile) {
      setGuardianPhotoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(guardianPhotoFile);
    setGuardianPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [guardianPhotoFile]);

  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState(0);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [drawerEnrollment, setDrawerEnrollment] = useState<Enrollment | null>(
    null,
  );
  const [portalAccessSaving, setPortalAccessSaving] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<
    string,
    number
  > | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    StudentAttendanceRecord[] | null
  >(null);
  const [feeDues, setFeeDues] = useState<FeeDue[] | null>(null);
  const [feePayments, setFeePayments] = useState<FeePayment[] | null>(null);
  const [timetable, setTimetable] = useState<StudentTimetableEntry[] | null>(
    null,
  );

  const dateRange30d = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start_date: isoDate(start), end_date: isoDate(end) };
  }, []);

  const filteredCounts = useMemo(() => {
    const active = students.filter(
      (s) => s.status?.toLowerCase() === "active",
    ).length;
    const inactive = students.filter(
      (s) => s.status?.toLowerCase() === "inactive",
    ).length;
    return { active, inactive };
  }, [students]);

  const classNameById = useMemo(() => {
    return classes.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [classes]);

  const sectionNameById = useMemo(() => {
    const acc: Record<string, string> = {};
    for (const sectionList of Object.values(sectionsByClassId)) {
      for (const item of sectionList) {
        acc[item.id] = item.name;
      }
    }
    return acc;
  }, [sectionsByClassId]);

  const enrollmentSectionOptions = useMemo(() => {
    if (!enrollmentForm.class_id) return [];
    return sectionsByClassId[enrollmentForm.class_id] ?? [];
  }, [enrollmentForm.class_id, sectionsByClassId]);

  const ensureSectionsForClass = useCallback(async (targetClassId: string) => {
    if (!targetClassId) return;
    if (sectionsByClassIdRef.current[targetClassId]) return;
    try {
      const list = await getSections(targetClassId);
      const active = list.filter((s) => s.is_active);
      sectionsByClassIdRef.current[targetClassId] = active;
      setSectionsByClassId((p) => ({ ...p, [targetClassId]: active }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        page: page + 1,
        limit: rowsPerPage,
        search: search.trim() || undefined,
        status: status || undefined,
        gender: gender || undefined,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
      });
      setStudents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load students", err);
      showToast({ severity: "error", message: "Failed to load students" });
    } finally {
      setLoading(false);
    }
  }, [classId, gender, page, rowsPerPage, search, sectionId, status]);

  useEffect(() => {
    async function load() {
      try {
        const list = await getClasses();
        setClasses(list.filter((c) => c.is_active));
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const year = await getCurrentAcademicYear();
        setCurrentAcademicYear(year);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadStudentSettings() {
      try {
        const response = await api.get("/settings/students.settings");
        const value = response.data?.value;
        if (typeof value !== "string" || !value.trim()) return;

        const loaded = JSON.parse(value);
        setStudentDialogSettings({
          medium_configuration: Array.isArray(loaded.medium_configuration)
            ? loaded.medium_configuration
            : defaultStudentDialogSettings.medium_configuration,
          shift_configuration: Array.isArray(loaded.shift_configuration)
            ? loaded.shift_configuration
            : defaultStudentDialogSettings.shift_configuration,
        });
      } catch (e) {
        console.error("Failed to load student dialog settings", e);
      }
    }

    loadStudentSettings();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, status, gender, classId, sectionId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    let cancelled = false;

    async function loadEnrollments() {
      if (students.length === 0) {
        setEnrollmentByStudentId({});
        return;
      }

      const yearId = currentAcademicYear?.id;
      const enrollments = await getEnrollmentsByStudents(
        students.map((s) => s.id),
        yearId,
      ).catch(() => []);

      if (cancelled) return;

      setEnrollmentByStudentId(
        enrollments.reduce<Record<string, Enrollment>>((acc, enrollment) => {
          acc[enrollment.student_id] = enrollment;
          return acc;
        }, {}),
      );
    }

    loadEnrollments();

    return () => {
      cancelled = true;
    };
  }, [currentAcademicYear?.id, students]);

  useEffect(() => {
    const classIds = [
      ...new Set(
        Object.values(enrollmentByStudentId)
          .map((e) => e.class_id)
          .filter(Boolean),
      ),
    ];
    classIds.forEach((cid) => ensureSectionsForClass(cid));
  }, [enrollmentByStudentId, ensureSectionsForClass]);

  useEffect(() => {
    async function load() {
      if (!classId) {
        setSections([]);
        setSectionId("");
        return;
      }
      try {
        const list = await getSections(classId);
        setSections(list.filter((s) => s.is_active));
        if (sectionId && !list.some((s) => s.id === sectionId)) {
          setSectionId("");
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [classId, sectionId]);

  useEffect(() => {
    if (!enrollmentForm.class_id) {
      if (enrollmentForm.section_id) {
        setEnrollmentForm((p) => ({ ...p, section_id: "" }));
      }
      return;
    }
    ensureSectionsForClass(enrollmentForm.class_id);
    const list = sectionsByClassIdRef.current[enrollmentForm.class_id] ?? [];
    if (
      enrollmentForm.section_id &&
      !list.some((s) => s.id === enrollmentForm.section_id)
    ) {
      setEnrollmentForm((p) => ({ ...p, section_id: "" }));
    }
  }, [
    enrollmentForm.class_id,
    enrollmentForm.section_id,
    ensureSectionsForClass,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function generateRollNumber() {
      if (!dialogOpen) return;

      if (
        !currentAcademicYear?.id ||
        !enrollmentForm.class_id ||
        !enrollmentForm.section_id
      ) {
        setRollNumberLoading(false);
        return;
      }

      const hasUnchangedEditEnrollment =
        dialogMode === "edit" &&
        initialEnrollmentForm &&
        initialEnrollmentForm.class_id === enrollmentForm.class_id &&
        initialEnrollmentForm.section_id === enrollmentForm.section_id &&
        initialEnrollmentForm.roll_number;

      if (hasUnchangedEditEnrollment || rollNumberManualRef.current) {
        setRollNumberLoading(false);
        if (hasUnchangedEditEnrollment) {
          setEnrollmentForm((p) =>
            p.roll_number === initialEnrollmentForm.roll_number
              ? p
              : { ...p, roll_number: initialEnrollmentForm.roll_number },
          );
        }
        return;
      }

      const classIdForRequest = enrollmentForm.class_id;
      const sectionIdForRequest = enrollmentForm.section_id;
      setRollNumberLoading(true);
      try {
        const nextRollNumber = await getNextEnrollmentRollNumber({
          academic_year_id: currentAcademicYear.id,
          class_id: classIdForRequest,
          section_id: sectionIdForRequest,
          roll_type: "student",
        });

        if (cancelled || rollNumberManualRef.current) return;

        setEnrollmentForm((p) => {
          if (
            p.class_id !== classIdForRequest ||
            p.section_id !== sectionIdForRequest ||
            rollNumberManualRef.current
          ) {
            return p;
          }
          return { ...p, roll_number: nextRollNumber };
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setRollNumberLoading(false);
        }
      }
    }

    generateRollNumber();

    return () => {
      cancelled = true;
    };
  }, [
    currentAcademicYear?.id,
    dialogMode,
    dialogOpen,
    enrollmentForm.class_id,
    enrollmentForm.section_id,
    initialEnrollmentForm,
  ]);

  async function openDrawer(studentId: string) {
    setDrawerStudentId(studentId);
    setDrawerTab(0);
    setDrawerStudent(null);
    setDrawerEnrollment(null);
    setAttendanceSummary(null);
    setAttendanceRecords(null);
    setFeeDues(null);
    setFeePayments(null);
    setTimetable(null);
    setDrawerLoading(true);
    try {
      const [s, enrollments] = await Promise.all([
        getStudent(studentId),
        getEnrollmentsByStudents([studentId], currentAcademicYear?.id).catch(
          () => [],
        ),
      ]);
      setDrawerStudent(s);
      setDrawerEnrollment(enrollments[0] ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  }

  useEffect(() => {
    async function loadTabData() {
      if (!drawerStudentId) return;
      if (drawerTab === 1 && (!attendanceSummary || !attendanceRecords)) {
        try {
          const [summary, records] = await Promise.all([
            getStudentAttendanceSummary(drawerStudentId, dateRange30d).catch(
              () => null,
            ),
            getStudentAttendance(drawerStudentId, dateRange30d).catch(
              () => null,
            ),
          ]);
          setAttendanceSummary(summary);
          setAttendanceRecords(records);
        } catch (e) {
          console.error(e);
        }
      }
      if (drawerTab === 2 && (!feeDues || !feePayments)) {
        try {
          const [dues, payments] = await Promise.all([
            getStudentFeeDues(drawerStudentId).catch(() => null),
            getStudentFeePayments(drawerStudentId).catch(() => null),
          ]);
          setFeeDues(dues);
          setFeePayments(payments);
        } catch (e) {
          console.error(e);
        }
      }
      if (drawerTab === 3 && !timetable) {
        try {
          const tt = await getStudentTimetable(drawerStudentId).catch(
            () => null,
          );
          setTimetable(tt);
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadTabData();
  }, [
    attendanceRecords,
    attendanceSummary,
    dateRange30d,
    drawerStudentId,
    drawerTab,
    feeDues,
    feePayments,
    timetable,
  ]);

  function openCreateDialog() {
    setDialogMode("create");
    setEditingStudentId(null);
    setDialogTab(0);
    setDialogLoading(false);
    setForm({ ...emptyStudentForm });
    setInitialEnrollmentForm(null);
    const defaultClassId = classId || classes[0]?.id || "";
    setEnrollmentForm({
      ...emptyEnrollmentForm,
      class_id: defaultClassId,
      section_id: "",
    });
    if (defaultClassId) ensureSectionsForClass(defaultClassId);
    if (!currentAcademicYear) {
      getCurrentAcademicYear()
        .then((year) => setCurrentAcademicYear(year))
        .catch((e) => console.error(e));
    }
    setStudentPhotoFile(null);
    setPreviousTcFile(null);
    setBirthCertificateFile(null);
    setSavedTransferCertificate(null);
    setSavedBirthCertificate(null);
    setFatherForm({ ...emptyFatherForm });
    setMotherForm({ ...emptyMotherForm });
    setGuardianForm({ ...emptyGuardianForm });
    setFatherPhotoFile(null);
    setMotherPhotoFile(null);
    setGuardianPhotoFile(null);
    autoPortalUsernameRef.current = "";
    autoParentEmailRef.current = "";
    rollNumberManualRef.current = false;
    setDialogOpen(true);
  }

  async function openEditDialog(s: Student) {
    setDialogMode("edit");
    setEditingStudentId(s.id);
    setDialogTab(0);
    setDialogOpen(true);
    setDialogLoading(true);
    setStudentPhotoFile(null);
    setPreviousTcFile(null);
    setBirthCertificateFile(null);
    setSavedTransferCertificate(null);
    setSavedBirthCertificate(null);
    setFatherForm({ ...emptyFatherForm });
    setMotherForm({ ...emptyMotherForm });
    setGuardianForm({ ...emptyGuardianForm });
    setFatherPhotoFile(null);
    setMotherPhotoFile(null);
    setGuardianPhotoFile(null);
    try {
      const full = await getStudent(s.id);
      const admissionNo = full.admission_no ?? "";
      const portalUsername =
        full.portal_username ?? defaultStudentPortalUsername(admissionNo);
      autoPortalUsernameRef.current = defaultStudentPortalUsername(admissionNo);
      autoParentEmailRef.current = defaultParentPortalEmail(admissionNo);
      setForm({
        first_name: full.first_name ?? "",
        last_name: full.last_name ?? "",
        admission_no: admissionNo,
        gender: full.gender ?? "",
        date_of_birth: full.date_of_birth ?? "",
        full_name_bc: full.full_name_bc ?? "",
        place_of_birth: full.place_of_birth ?? "",
        nationality: full.nationality ?? "",
        religion: full.religion ?? "",
        blood_group: full.blood_group ?? "",
        admission_date: full.admission_date ?? "",
        admission_status: full.admission_status ?? "pending",
        medium: full.medium ?? "",
        shift: full.shift ?? "",
        previous_school_name: full.previous_school_name ?? "",
        previous_class: full.previous_class ?? "",
        transfer_certificate_no: full.transfer_certificate_no ?? "",
        present_address: full.present_address ?? "",
        permanent_address: full.permanent_address ?? "",
        city: full.city ?? "",
        thana: full.thana ?? "",
        postal_code: full.postal_code ?? "",
        emergency_contact_name: full.emergency_contact_name ?? "",
        emergency_contact_phone: full.emergency_contact_phone ?? "",
        known_allergies: full.known_allergies ?? "",
        chronic_illness: full.chronic_illness ?? "",
        physical_disabilities: full.physical_disabilities ?? "",
        special_needs: full.special_needs ?? "",
        doctor_name: full.doctor_name ?? "",
        doctor_phone: full.doctor_phone ?? "",
        vaccination_status: full.vaccination_status ?? "",
        birth_certificate_no: full.birth_certificate_no ?? "",
        national_id_no: full.national_id_no ?? "",
        passport_no: full.passport_no ?? "",
        fee_category: full.fee_category ?? "",
        scholarship_type: full.scholarship_type ?? "",
        portal_username: portalUsername,
        portal_access_student: full.portal_access_student ?? false,
        portal_access_parent: full.portal_access_parent ?? false,
        remarks: full.remarks ?? "",
        rfid_nfc_no: full.rfid_nfc_no ?? "",
        hostel_status: full.hostel_status ?? "",
        library_card_no: full.library_card_no ?? "",
        photo_url: full.photo_url ?? "",
        status: full.status ?? "active",
      });

      const yearId = currentAcademicYear?.id;
      const enrollments: Enrollment[] = await getEnrollmentsByStudents(
        [s.id],
        yearId,
      ).catch(() => []);
      const e = enrollments[0];
      const targetClassId = e?.class_id ?? "";
      const nextEnrollmentForm = {
        class_id: targetClassId,
        section_id: e?.section_id ?? "",
        roll_number: e?.roll_number != null ? String(e.roll_number) : "",
      };
      setEnrollmentForm(nextEnrollmentForm);
      setInitialEnrollmentForm(nextEnrollmentForm);
      rollNumberManualRef.current = Boolean(nextEnrollmentForm.roll_number);
      if (targetClassId) ensureSectionsForClass(targetClassId);

      const documents = await getStudentDocuments(s.id).catch(() => []);
      setSavedTransferCertificate(
        documents.find((doc) => doc.entity_type === "student:transfer_certificate") ??
          null,
      );
      setSavedBirthCertificate(
        documents.find((doc) => doc.entity_type === "student:birth_certificate") ??
          null,
      );

      try {
        const guardians = await getStudentGuardians(s.id);
        const relationOf = (guardian: GuardianWithRelation) =>
          guardian.relation?.trim().toLowerCase() ?? "";
        const father = guardians.find(
          (g) => relationOf(g) === "father",
        );
        if (father) {
          setFatherForm({
            id: father.id,
            full_name: father.full_name,
            occupation: father.occupation || "",
            phone: father.phone || "",
            email: father.email || "",
            id_number: father.id_number || "",
            photo_url: father.photo_url || "",
          });
        }
        const mother = guardians.find(
          (g) => relationOf(g) === "mother",
        );
        if (mother) {
          setMotherForm({
            id: mother.id,
            full_name: mother.full_name,
            occupation: mother.occupation || "",
            phone: mother.phone || "",
            email: mother.email || "",
            id_number: mother.id_number || "",
            photo_url: mother.photo_url || "",
          });
        }
        const other = guardians.find(
          (g) => !["father", "mother"].includes(relationOf(g)),
        );
        if (other) {
          setGuardianForm({
            id: other.id,
            full_name: other.full_name,
            relation: other.relation || "guardian",
            phone: other.phone || "",
            email: other.email || "",
            occupation: other.occupation || "",
            id_number: other.id_number || "",
            address: other.address || "",
            photo_url: other.photo_url || "",
          });
        }
      } catch (e) {
        console.error("Failed to load guardians", e);
      }
    } catch (e) {
      console.error(e);
      showToast({ severity: "error", message: "Failed to load student" });
    } finally {
      setDialogLoading(false);
    }
  }

  async function saveGuardianForStudent(
    studentId: string,
    guardian: {
      id?: string;
      relation: string;
      is_primary: boolean;
      payload: Parameters<typeof createGuardian>[0];
      photoFile: File | null;
    },
  ) {
    if (!guardian.payload.full_name?.trim()) return;

    const guardianId = guardian.id
      ? (
          await updateGuardian(guardian.id, guardian.payload)
        ).id
      : (
          await createGuardian(guardian.payload)
        ).id;

    if (guardian.photoFile) {
      await uploadGuardianPhoto(guardianId, guardian.photoFile);
    }

    await linkGuardianToStudent(studentId, {
      guardian_id: guardianId,
      relation: guardian.relation,
      is_primary: guardian.is_primary,
    });
  }

  async function openSavedDocument(document: StudentDocument | null) {
    if (!document) return;
    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        URL.revokeObjectURL(url);
        showToast({ severity: "error", message: "Please allow popups to view this file" });
        return;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error(e);
      showToast({ severity: "error", message: "Failed to open file" });
    }
  }

  function renderPersonPhotoPreview(
    file: File | null,
    previewUrl: string,
    savedUrl: string,
    label: string,
  ) {
    if (file) {
      return (
        <Box
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            component="img"
            src={previewUrl}
            alt={`Selected ${label}`}
            onClick={() => openSelectedFile(file)}
            sx={{
              width: 88,
              height: 88,
              borderRadius: 2,
              objectFit: "cover",
              cursor: "pointer",
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Link
            component="button"
            variant="body2"
            onClick={() => openSelectedFile(file)}
          >
            {file.name}
          </Link>
        </Box>
      );
    }

    const resolvedUrl = getFileUrl(savedUrl);
    if (!resolvedUrl) return null;

    return (
      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          component="img"
          src={resolvedUrl}
          alt={`Saved ${label}`}
          onClick={() => openUrlInNewTab(resolvedUrl)}
          sx={{
            width: 88,
            height: 88,
            borderRadius: 2,
            objectFit: "cover",
            cursor: "pointer",
            border: "1px solid",
            borderColor: "divider",
          }}
        />
        <Link
          component="button"
          variant="body2"
          onClick={() => openUrlInNewTab(resolvedUrl)}
        >
          {getFileNameFromUrl(savedUrl) || `${label} Photo`}
        </Link>
      </Box>
    );
  }

  async function handleSaveStudent() {
    if (!form.first_name.trim()) {
      showToast({ severity: "error", message: "First name is required" });
      return;
    }
    if (!form.admission_status) {
      showToast({ severity: "error", message: "Admission status is required" });
      return;
    }
    if (!enrollmentForm.class_id) {
      showToast({ severity: "error", message: "Class is required" });
      return;
    }
    if (!enrollmentForm.roll_number.trim()) {
      showToast({ severity: "error", message: "Roll number is required" });
      return;
    }
    if (dialogMode === "create" && !currentAcademicYear?.id) {
      showToast({
        severity: "error",
        message: "Current academic year is not set",
      });
      return;
    }

    if (form.portal_username) {
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(form.portal_username)) {
        showToast({
          severity: "error",
          message: "Portal username can only contain letters, numbers, dots, dashes, and underscores.",
        });
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const [name, address] of [
      ["Father", fatherForm.email],
      ["Mother", motherForm.email],
      ["Guardian", guardianForm.email],
    ]) {
      if (address && !emailRegex.test(address)) {
        showToast({ severity: "error", message: `Invalid email format for ${name}` });
        return;
      }
    }

    setDialogSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: nullIfBlank(form.last_name),
        admission_no: nullIfBlank(form.admission_no),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        full_name_bc: nullIfBlank(form.full_name_bc),
        place_of_birth: nullIfBlank(form.place_of_birth),
        nationality: nullIfBlank(form.nationality),
        religion: nullIfBlank(form.religion),
        blood_group: nullIfBlank(form.blood_group),
        admission_date: form.admission_date || null,
        admission_status: form.admission_status || "pending",
        medium: nullIfBlank(form.medium),
        shift: nullIfBlank(form.shift),
        previous_school_name: nullIfBlank(form.previous_school_name),
        previous_class: nullIfBlank(form.previous_class),
        transfer_certificate_no: nullIfBlank(form.transfer_certificate_no),
        present_address: nullIfBlank(form.present_address),
        permanent_address: nullIfBlank(form.permanent_address),
        city: nullIfBlank(form.city),
        thana: nullIfBlank(form.thana),
        postal_code: nullIfBlank(form.postal_code),
        emergency_contact_name: nullIfBlank(form.emergency_contact_name),
        emergency_contact_phone: nullIfBlank(form.emergency_contact_phone),
        known_allergies: nullIfBlank(form.known_allergies),
        chronic_illness: nullIfBlank(form.chronic_illness),
        physical_disabilities: nullIfBlank(form.physical_disabilities),
        special_needs: nullIfBlank(form.special_needs),
        doctor_name: nullIfBlank(form.doctor_name),
        doctor_phone: nullIfBlank(form.doctor_phone),
        vaccination_status: nullIfBlank(form.vaccination_status),
        birth_certificate_no: nullIfBlank(form.birth_certificate_no),
        national_id_no: nullIfBlank(form.national_id_no),
        passport_no: nullIfBlank(form.passport_no),
        fee_category: nullIfBlank(form.fee_category),
        scholarship_type: nullIfBlank(form.scholarship_type),
        portal_username: nullIfBlank(form.portal_username),
        portal_access_student: form.portal_access_student,
        portal_access_parent: form.portal_access_parent,
        remarks: nullIfBlank(form.remarks),
        rfid_nfc_no: nullIfBlank(form.rfid_nfc_no),
        hostel_status: nullIfBlank(form.hostel_status),
        library_card_no: nullIfBlank(form.library_card_no),
        status: form.status || "active",
      };
      const roll = enrollmentForm.roll_number.trim() || null;

      if (dialogMode === "create") {
        const created = await createStudent(payload);

        if (studentPhotoFile) {
          await uploadStudentPhoto(created.id, studentPhotoFile);
        }
        if (previousTcFile) {
          const doc = await uploadStudentDocument(
            created.id,
            previousTcFile,
            "transfer_certificate",
          );
          setSavedTransferCertificate(doc);
        }
        if (birthCertificateFile) {
          const doc = await uploadStudentDocument(
            created.id,
            birthCertificateFile,
            "birth_certificate",
          );
          setSavedBirthCertificate(doc);
        }

        const guardiansToCreate: Array<{
          id?: string;
          relation: string;
          is_primary: boolean;
          payload: Parameters<typeof createGuardian>[0];
          photoFile: File | null;
        }> = [
          {
            id: fatherForm.id,
            relation: "father",
            is_primary: true,
            payload: {
              full_name: fatherForm.full_name.trim(),
              occupation: nullIfBlank(fatherForm.occupation),
              phone: nullIfBlank(fatherForm.phone),
              email: nullIfBlank(fatherForm.email),
              id_number: nullIfBlank(fatherForm.id_number),
            },
            photoFile: fatherPhotoFile,
          },
          {
            id: motherForm.id,
            relation: "mother",
            is_primary: false,
            payload: {
              full_name: motherForm.full_name.trim(),
              occupation: nullIfBlank(motherForm.occupation),
              phone: nullIfBlank(motherForm.phone),
              email: nullIfBlank(motherForm.email),
              id_number: nullIfBlank(motherForm.id_number),
            },
            photoFile: motherPhotoFile,
          },
          {
            id: guardianForm.id,
            relation: guardianForm.relation || "guardian",
            is_primary: form.portal_access_parent,
            payload: {
              full_name: guardianForm.full_name.trim(),
              occupation: nullIfBlank(guardianForm.occupation),
              phone: nullIfBlank(guardianForm.phone),
              email: nullIfBlank(guardianForm.email),
              id_number: nullIfBlank(guardianForm.id_number),
              address: nullIfBlank(guardianForm.address),
            },
            photoFile: guardianPhotoFile,
          },
        ];
        if (form.portal_access_parent) {
          const hasPrimaryGuardian = guardiansToCreate.some(
            (g) => g.is_primary && g.payload.full_name,
          );
          if (!hasPrimaryGuardian) {
            const studentName = [form.first_name, form.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            guardiansToCreate.push({
              relation: "guardian",
              is_primary: true,
              payload: {
                full_name: studentName ? `${studentName} Parent` : "Parent",
                occupation: null,
                phone: null,
                email: nullIfBlank(guardianForm.email),
                id_number: null,
                address: null,
              },
              photoFile: null,
            });
          }
        }

        for (const g of guardiansToCreate) {
          await saveGuardianForStudent(created.id, g);
        }

        await createEnrollment({
          student_id: created.id,
          academic_year_id: currentAcademicYear!.id,
          class_id: enrollmentForm.class_id,
          section_id: enrollmentForm.section_id || null,
          roll_number: roll,
        });
        showToast({ severity: "success", message: "Student created" });
      } else if (editingStudentId) {
        await updateStudent(editingStudentId, payload);
        if (studentPhotoFile) {
          await uploadStudentPhoto(editingStudentId, studentPhotoFile);
          const refreshed = await getStudent(editingStudentId).catch(() => null);
          if (refreshed) {
            setForm((p) => ({ ...p, photo_url: refreshed.photo_url ?? "" }));
          }
          setStudentPhotoFile(null);
        }
        if (previousTcFile) {
          const doc = await uploadStudentDocument(
            editingStudentId,
            previousTcFile,
            "transfer_certificate",
          );
          setSavedTransferCertificate(doc);
          setPreviousTcFile(null);
        }
        if (birthCertificateFile) {
          const doc = await uploadStudentDocument(
            editingStudentId,
            birthCertificateFile,
            "birth_certificate",
          );
          setSavedBirthCertificate(doc);
          setBirthCertificateFile(null);
        }

        const guardiansToProcess = [
          {
            id: fatherForm.id,
            relation: "father",
            is_primary: true,
            payload: {
              full_name: fatherForm.full_name.trim(),
              occupation: nullIfBlank(fatherForm.occupation),
              phone: nullIfBlank(fatherForm.phone),
              email: nullIfBlank(fatherForm.email),
              id_number: nullIfBlank(fatherForm.id_number),
            },
            photoFile: fatherPhotoFile,
          },
          {
            id: motherForm.id,
            relation: "mother",
            is_primary: false,
            payload: {
              full_name: motherForm.full_name.trim(),
              occupation: nullIfBlank(motherForm.occupation),
              phone: nullIfBlank(motherForm.phone),
              email: nullIfBlank(motherForm.email),
              id_number: nullIfBlank(motherForm.id_number),
            },
            photoFile: motherPhotoFile,
          },
          {
            id: guardianForm.id,
            relation: guardianForm.relation || "guardian",
            is_primary: form.portal_access_parent,
            payload: {
              full_name: guardianForm.full_name.trim(),
              occupation: nullIfBlank(guardianForm.occupation),
              phone: nullIfBlank(guardianForm.phone),
              email: nullIfBlank(guardianForm.email),
              id_number: nullIfBlank(guardianForm.id_number),
              address: nullIfBlank(guardianForm.address),
            },
            photoFile: guardianPhotoFile,
          },
        ];
        if (form.portal_access_parent) {
          const hasPrimaryGuardian = guardiansToProcess.some(
            (g) => g.is_primary && g.payload.full_name,
          );
          if (!hasPrimaryGuardian) {
            const studentName = [form.first_name, form.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            guardiansToProcess.push({
              id: undefined,
              relation: "guardian",
              is_primary: true,
              payload: {
                full_name: studentName ? `${studentName} Parent` : "Parent",
                occupation: null,
                phone: null,
                email: nullIfBlank(guardianForm.email),
                id_number: null,
                address: null,
              },
              photoFile: null,
            });
          }
        }

        for (const g of guardiansToProcess) {
          await saveGuardianForStudent(editingStudentId, g);
        }

        const yearId = currentAcademicYear?.id;
        const enrollments: Enrollment[] = await getEnrollmentsByStudents(
          [editingStudentId],
          yearId,
        ).catch(() => []);
        const current = enrollments[0];
        if (current) {
          await updateEnrollment(current.id, {
            class_id: enrollmentForm.class_id,
            section_id: enrollmentForm.section_id || null,
            roll_number: roll,
          });
        } else if (yearId) {
          await createEnrollment({
            student_id: editingStudentId,
            academic_year_id: yearId,
            class_id: enrollmentForm.class_id,
            section_id: enrollmentForm.section_id || null,
            roll_number: roll,
          });
        }
        showToast({ severity: "success", message: "Student updated" });
      }
      setDialogOpen(false);
      loadStudents();
    } catch (e) {
      console.error(e);
      showToast({ severity: "error", message: "Failed to save student" });
    } finally {
      setDialogSaving(false);
    }
  }

  async function handleDeactivateStudent(s: Student) {
    try {
      await updateStudent(s.id, { status: "inactive" });
      loadStudents();
      if (drawerStudentId === s.id) {
        const updated = await getStudent(s.id);
        setDrawerStudent(updated);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEnableStudentPortalAccess(s: Student) {
    if (s.portal_access_student) {
      showToast({ severity: "info", message: "Student portal access is already enabled" });
      return;
    }
    const portalUsername =
      s.portal_username ||
      defaultStudentPortalUsername(s.admission_no || "") ||
      `stu${s.id.slice(0, 6)}`;

    setPortalAccessSaving(true);
    try {
      const updated = await updateStudent(s.id, {
        portal_username: portalUsername,
        portal_access_student: true,
      });
      if (drawerStudentId === s.id) {
        setDrawerStudent(updated);
      }
      loadStudents();
      showToast({
        severity: "success",
        message: "Student portal access enabled",
      });
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: "Failed to enable student portal access",
      });
    } finally {
      setPortalAccessSaving(false);
    }
  }

  function handleDeleteStudent(s: Student) {
    setDeleteConfirmStudent(s);
  }

  async function confirmDeleteStudent() {
    if (!deleteConfirmStudent) return;
    setDeleteLoading(true);
    try {
      await deleteStudent(deleteConfirmStudent.id);
      setDeleteConfirmStudent(null);
      if (drawerStudentId === deleteConfirmStudent.id) {
        setDrawerStudentId(null);
      }
      showToast({ severity: "success", message: `${formatStudentName(deleteConfirmStudent)} deleted successfully` });
      loadStudents();
    } catch (e) {
      console.error(e);
      showToast({ severity: "error", message: "Failed to delete student. Please try again." });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleExportCsv() {
    try {
      const blob = await exportStudentsCsv();
      if (blob.type && blob.type.includes("application/json")) {
        showToast({
          severity: "error",
          message: "Student export failed. Please try again.",
        });
        return;
      }
      downloadBlob(blob, "students.xlsx");
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: "Student export failed. Please try again.",
      });
    }
  }

  async function handleDownloadImportTemplate() {
    try {
      const blob = await downloadStudentImportTemplate();
      if (blob.type && blob.type.includes("application/json")) {
        showToast({
          severity: "error",
          message: "Import template download failed. Please try again.",
        });
        return;
      }
      downloadBlob(blob, "student_import_template.xlsx");
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: "Import template download failed. Please try again.",
      });
    }
  }

  async function handleImportCsv(file: File) {
    try {
      const res = await bulkImportStudentsCsv(file);
      const skipped = res.skipped ?? 0;
      const firstError = res.errors?.[0];
      if (res.created === 0) {
        showToast({
          severity: "error",
          message: firstError
            ? `Import failed. Row ${firstError.row}: ${firstError.reason}`
            : "No students were imported. Check the template columns and try again.",
        });
        return;
      }
      showToast({
        severity: skipped ? "warning" : "success",
        message: skipped
          ? `Imported ${res.created} students. Skipped ${skipped}${
              firstError ? `. First error: Row ${firstError.row}: ${firstError.reason}` : ""
            }`
          : `Imported ${res.created} students`,
      });
      setPage(0);
      loadStudents();
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: "Student import failed. Upload the Excel template (.xlsx) and try again.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownloadIdCard(s: Student) {
    try {
      const blob = await downloadStudentIdCard(s.id);
      downloadBlob(blob, `id_card_${s.id}.html`);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Box sx={{ width: "100%", pb: 2 }}>
      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              height: "100%",
              background: "linear-gradient(135deg, #3F51B5 0%, #303F9F 100%)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0px 10px 20px rgba(63, 81, 181, 0.2)",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ opacity: 0.8, letterSpacing: 1 }}
              >
                Total Students
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                {total.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 2 }}>
              Registered in the system
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              height: "100%",
              bgcolor: "white",
              border: "1px solid #E0E0E0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={700}
                color="text.secondary"
              >
                Active Status
              </Typography>
              <Chip
                label="Live Stats"
                size="small"
                color="success"
                variant="outlined"
              />
            </Box>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="text.primary">
                  {filteredCounts.active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="text.secondary"
                >
                  {filteredCounts.inactive}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Inactive
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              height: "100%",
              background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 2,
              boxShadow: "0px 10px 20px rgba(255, 152, 0, 0.2)",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ opacity: 0.8, letterSpacing: 1 }}
              >
                Academics
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                {classes.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                Active classes
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Actions & Filters Container */}
      <Paper
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #E0E0E0",
          boxShadow: "0px 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #F0F0F0",
            bgcolor: "#FAFAFA",
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* Search */}
          <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                sx: { bgcolor: "white", borderRadius: 2 },
              }}
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportCsv(f);
              }}
            />

            <Tooltip title="Download import template">
              <IconButton
                size="small"
                onClick={handleDownloadImportTemplate}
                sx={{ bgcolor: "white", border: "1px solid #E0E0E0" }}
              >
                <FileDownload fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bulk Import">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{ bgcolor: "white", border: "1px solid #E0E0E0" }}
              >
                <UploadFile fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Excel">
              <IconButton
                size="small"
                onClick={handleExportCsv}
                sx={{ bgcolor: "white", border: "1px solid #E0E0E0" }}
              >
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh List">
              <IconButton
                size="small"
                onClick={() => loadStudents()}
                disabled={loading}
                sx={{ bgcolor: "white", border: "1px solid #E0E0E0" }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              sx={{
                borderRadius: 2,
                px: 3,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Add Student
            </Button>
          </Box>
        </Box>

        {/* Filters Row */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            bgcolor: "white",
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={classId}
              label="Class"
              onChange={(e) => setClassId(e.target.value)}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }} disabled={!classId}>
            <InputLabel>Section</InputLabel>
            <Select
              value={sectionId}
              label="Section"
              onChange={(e) => setSectionId(e.target.value)}
            >
              <MenuItem value="">All Sections</MenuItem>
              {sections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
              <MenuItem value="alumni">Alumni</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={gender}
              label="Gender"
              onChange={(e) => setGender(e.target.value)}
            >
              <MenuItem value="">All Genders</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      ID / Adm No
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      Student Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      Admission Roll Number
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      Class
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      Section
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}>
                      Status
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, bgcolor: "#F8F9FA" }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => openDrawer(row.id)}
                      sx={{
                        cursor: "pointer",
                        "&:last-child td, &:last-child th": { border: 0 },
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: "#F5F5F5" },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="primary"
                        >
                          {row.admission_no || "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{row.id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          {/* Avatar Placeholder */}
                          <Avatar
                            src={getFileUrl(row.photo_url)}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "primary.light",
                              color: "primary.main",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                            }}
                          >
                            {row.first_name?.[0]}
                            {row.last_name?.[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {formatStudentName(row)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {enrollmentByStudentId[row.id]?.roll_number || "-"}
                      </TableCell>
                      <TableCell>
                        {classNameById[enrollmentByStudentId[row.id]?.class_id || ""] ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {sectionNameById[
                          enrollmentByStudentId[row.id]?.section_id || ""
                        ] || "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(row.status || "-").toUpperCase()}
                          color={statusChipColor(row.status || "")}
                          size="small"
                          sx={{ fontWeight: 600, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsAnchor(e.currentTarget);
                            setActionsStudent(row);
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ py: 8, textAlign: "center" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            opacity: 0.6,
                          }}
                        >
                          <Search sx={{ fontSize: 48 }} />
                          <Typography variant="h6">
                            No students found
                          </Typography>
                          <Typography variant="body2">
                            Try adjusting your filters or search terms.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <TablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </Paper>

      <Menu
        open={Boolean(actionsAnchor)}
        anchorEl={actionsAnchor}
        onClose={() => {
          setActionsAnchor(null);
          setActionsStudent(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (actionsStudent) openDrawer(actionsStudent.id);
            setActionsAnchor(null);
          }}
        >
          View / Manage
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) openEditDialog(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) handleDownloadIdCard(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Download ID Card
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={
            !actionsStudent || actionsStudent.status?.toLowerCase() !== "active"
          }
          onClick={() => {
            if (actionsStudent) handleDeactivateStudent(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Deactivate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) handleDeleteStudent(actionsStudent);
            setActionsAnchor(null);
          }}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteConfirmStudent)}
        onClose={() => !deleteLoading && setDeleteConfirmStudent(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Student</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteConfirmStudent ? formatStudentName(deleteConfirmStudent) : ""}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently remove the student along with all their
            attendance records, enrollments, marks, documents, and other
            related data. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmStudent(null)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteStudent}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {dialogMode === "create" ? "Add Student" : "Edit Student"}
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={dialogTab}
            onChange={(_e, v) => setDialogTab(v)}
            sx={{ mt: 1 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Basics" />
            <Tab label="Enrollment" />
            <Tab label="Admission" />
            <Tab label="Address" />
            <Tab label="Health & IDs" />
            <Tab label="Portal & Files" />
            <Tab label="Guardians" />
          </Tabs>

          {dialogLoading ? (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {dialogTab === 0 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="First Name"
                      fullWidth
                      margin="normal"
                      value={form.first_name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, first_name: e.target.value }))
                      }
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Last Name"
                      fullWidth
                      margin="normal"
                      value={form.last_name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, last_name: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Admission No"
                      fullWidth
                      margin="normal"
                      value={form.admission_no}
                      InputProps={{ readOnly: true }}
                      onChange={(e) =>
                        setForm((p) => {
                          const nextAdmission = e.target.value;
                          const nextAuto =
                            defaultStudentPortalUsername(nextAdmission);
                          const shouldUpdatePortal =
                            !p.portal_username ||
                            p.portal_username === autoPortalUsernameRef.current;
                          autoPortalUsernameRef.current = nextAuto;
                          return {
                            ...p,
                            admission_no: nextAdmission,
                            portal_username: shouldUpdatePortal
                              ? nextAuto
                              : p.portal_username,
                          };
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name (Birth Cert)"
                      fullWidth
                      margin="normal"
                      value={form.full_name_bc}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, full_name_bc: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={form.gender}
                        label="Gender"
                        onChange={(e) =>
                          setForm((p) => ({ ...p, gender: e.target.value }))
                        }
                      >
                        <MenuItem value="">Unspecified</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Date of Birth"
                      type="date"
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      value={form.date_of_birth}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          date_of_birth: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={form.status}
                        label="Status"
                        onChange={(e) =>
                          setForm((p) => ({ ...p, status: e.target.value }))
                        }
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                        <MenuItem value="alumni">Alumni</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {dialogTab === 1 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Academic Year"
                      fullWidth
                      margin="normal"
                      value={currentAcademicYear?.name || ""}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Roll Number"
                      fullWidth
                      margin="normal"
                      value={enrollmentForm.roll_number}
                      onChange={(e) => {
                        rollNumberManualRef.current = true;
                        setEnrollmentForm((p) => ({
                          ...p,
                          roll_number: e.target.value,
                        }));
                      }}
                      inputProps={{ maxLength: 32 }}
                      placeholder={
                        rollNumberLoading
                          ? "Suggesting next roll..."
                          : "Enter roll number"
                      }
                      helperText="You can type a custom roll number (for example the Hik-Connect ID). A suggestion is filled only if this field is left unchanged."
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel>Class</InputLabel>
                      <Select
                        value={enrollmentForm.class_id}
                        label="Class"
                        onChange={(e) =>
                          setEnrollmentForm((p) => ({
                            ...p,
                            class_id: e.target.value,
                            section_id: "",
                          }))
                        }
                      >
                        <MenuItem value="">Select class</MenuItem>
                        {classes.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      disabled={!enrollmentForm.class_id}
                    >
                      <InputLabel>Section</InputLabel>
                      <Select
                        value={enrollmentForm.section_id}
                        label="Section"
                        onChange={(e) =>
                          setEnrollmentForm((p) => ({
                            ...p,
                            section_id: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {enrollmentSectionOptions.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              {dialogTab === 2 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Admission Date"
                      type="date"
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      value={form.admission_date}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          admission_date: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel>Admission Status</InputLabel>
                      <Select
                        value={form.admission_status}
                        label="Admission Status"
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            admission_status: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                        <MenuItem value="withdrawn">Withdrawn</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Medium</InputLabel>
                      <Select
                        value={form.medium}
                        label="Medium"
                        onChange={(e) =>
                          setForm((p) => ({ ...p, medium: e.target.value }))
                        }
                      >
                        <MenuItem value="">Select medium</MenuItem>
                        {studentDialogSettings.medium_configuration.map((medium) => (
                          <MenuItem key={medium} value={medium}>
                            {medium}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Shift</InputLabel>
                      <Select
                        value={form.shift}
                        label="Shift"
                        onChange={(e) =>
                          setForm((p) => ({ ...p, shift: e.target.value }))
                        }
                      >
                        <MenuItem value="">Select shift</MenuItem>
                        {studentDialogSettings.shift_configuration.map((shift) => (
                          <MenuItem key={shift} value={shift}>
                            {shift}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Previous School Name"
                      fullWidth
                      margin="normal"
                      value={form.previous_school_name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          previous_school_name: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Previous Class"
                      fullWidth
                      margin="normal"
                      value={form.previous_class}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          previous_class: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Transfer Certificate No"
                      fullWidth
                      margin="normal"
                      value={form.transfer_certificate_no}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          transfer_certificate_no: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Fee Category"
                      fullWidth
                      margin="normal"
                      value={form.fee_category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, fee_category: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Scholarship Type"
                      fullWidth
                      margin="normal"
                      value={form.scholarship_type}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          scholarship_type: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="RFID / NFC No"
                      fullWidth
                      margin="normal"
                      value={form.rfid_nfc_no}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, rfid_nfc_no: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Hostel Status"
                      fullWidth
                      margin="normal"
                      value={form.hostel_status}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          hostel_status: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Library Card No"
                      fullWidth
                      margin="normal"
                      value={form.library_card_no}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          library_card_no: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Remarks"
                      fullWidth
                      margin="normal"
                      value={form.remarks}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, remarks: e.target.value }))
                      }
                      multiline
                      minRows={3}
                    />
                  </Grid>
                </Grid>
              )}

              {dialogTab === 3 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Present Address"
                      fullWidth
                      margin="normal"
                      value={form.present_address}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          present_address: e.target.value,
                        }))
                      }
                      multiline
                      minRows={2}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Permanent Address"
                      fullWidth
                      margin="normal"
                      value={form.permanent_address}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          permanent_address: e.target.value,
                        }))
                      }
                      multiline
                      minRows={2}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="City"
                      fullWidth
                      margin="normal"
                      value={form.city}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, city: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Thana"
                      fullWidth
                      margin="normal"
                      value={form.thana}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, thana: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Postal Code"
                      fullWidth
                      margin="normal"
                      value={form.postal_code}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, postal_code: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Emergency Contact Name"
                      fullWidth
                      margin="normal"
                      value={form.emergency_contact_name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          emergency_contact_name: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Emergency Contact Phone"
                      fullWidth
                      margin="normal"
                      value={form.emergency_contact_phone}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          emergency_contact_phone: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                </Grid>
              )}

              {dialogTab === 4 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Place of Birth"
                      fullWidth
                      margin="normal"
                      value={form.place_of_birth}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          place_of_birth: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Nationality"
                      fullWidth
                      margin="normal"
                      value={form.nationality}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nationality: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Religion"
                      fullWidth
                      margin="normal"
                      value={form.religion}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, religion: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Blood Group"
                      fullWidth
                      margin="normal"
                      value={form.blood_group}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, blood_group: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Known Allergies"
                      fullWidth
                      margin="normal"
                      value={form.known_allergies}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          known_allergies: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chronic Illness"
                      fullWidth
                      margin="normal"
                      value={form.chronic_illness}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          chronic_illness: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Physical Disabilities"
                      fullWidth
                      margin="normal"
                      value={form.physical_disabilities}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          physical_disabilities: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Special Needs"
                      fullWidth
                      margin="normal"
                      value={form.special_needs}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          special_needs: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Doctor Name"
                      fullWidth
                      margin="normal"
                      value={form.doctor_name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, doctor_name: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Doctor Phone"
                      fullWidth
                      margin="normal"
                      value={form.doctor_phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, doctor_phone: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Vaccination Status"
                      fullWidth
                      margin="normal"
                      value={form.vaccination_status}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          vaccination_status: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Birth Certificate No"
                      fullWidth
                      margin="normal"
                      value={form.birth_certificate_no}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          birth_certificate_no: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="National ID No"
                      fullWidth
                      margin="normal"
                      value={form.national_id_no}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          national_id_no: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Passport No"
                      fullWidth
                      margin="normal"
                      value={form.passport_no}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, passport_no: e.target.value }))
                      }
                    />
                  </Grid>
                </Grid>
              )}

              {dialogTab === 5 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Portal Username"
                      fullWidth
                      margin="normal"
                      value={form.portal_username}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          portal_username: e.target.value,
                        }))
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.portal_access_student}
                          onChange={(e) =>
                            setForm((p) => {
                              const nextChecked = e.target.checked;
                              const nextAuto = defaultStudentPortalUsername(
                                p.admission_no,
                              );
                              autoPortalUsernameRef.current = nextAuto;
                              return {
                                ...p,
                                portal_access_student: nextChecked,
                                portal_username:
                                  nextChecked &&
                                  (!p.portal_username ||
                                    p.portal_username ===
                                      autoPortalUsernameRef.current)
                                    ? nextAuto
                                    : p.portal_username,
                              };
                            })
                          }
                        />
                      }
                      label="Portal access (student)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.portal_access_parent}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              portal_access_parent: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Portal access (parent)"
                    />
                    {form.portal_access_parent && (
                      <Box sx={{ mt: 1.5 }}>
                        <Autocomplete
                          size="small"
                          options={guardianOptions}
                          getOptionLabel={(option) =>
                            typeof option === "string"
                              ? option
                              : `${option.full_name} (${option.phone || "-"})`
                          }
                          loading={guardianLoading}
                          onOpen={() => setGuardianSearchOpen(true)}
                          onClose={() => setGuardianSearchOpen(false)}
                          onInputChange={(_, val) =>
                            setGuardianSearchInput(val)
                          }
                          onChange={(_, value) => {
                            if (value && typeof value !== "string") {
                              setGuardianForm({
                                id: value.id,
                                full_name: value.full_name,
                                relation: "guardian",
                                phone: value.phone || "",
                                email: value.email || "",
                                occupation: value.occupation || "",
                                id_number: value.id_number || "",
                                address: value.address || "",
                                photo_url: value.photo_url || "",
                              });
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Search Existing Parent/Guardian"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {guardianLoading ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={20}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                        <TextField
                          label="Parent Portal Username"
                          fullWidth
                          margin="normal"
                          value={defaultParentPortalUsername(form.admission_no)}
                          InputProps={{ readOnly: true }}
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFile />}
                      >
                        Select Student Photo
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) =>
                            setStudentPhotoFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </Button>
                      {studentPhotoFile ? (
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Box
                            component="img"
                            src={studentPhotoPreviewUrl}
                            alt="Selected student"
                            onClick={() => openSelectedFile(studentPhotoFile)}
                            sx={{
                              width: 88,
                              height: 88,
                              borderRadius: 2,
                              objectFit: "cover",
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => openSelectedFile(studentPhotoFile)}
                          >
                            {studentPhotoFile.name}
                          </Link>
                        </Box>
                      ) : form.photo_url ? (
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Box
                            component="img"
                            src={getFileUrl(form.photo_url)}
                            alt="Saved student"
                            onClick={() => openUrlInNewTab(getFileUrl(form.photo_url))}
                            sx={{
                              width: 88,
                              height: 88,
                              borderRadius: 2,
                              objectFit: "cover",
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => openUrlInNewTab(getFileUrl(form.photo_url))}
                          >
                            {getFileNameFromUrl(form.photo_url) || "Current Photo"}
                          </Link>
                        </Box>
                      ) : null}

                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFile />}
                      >
                        Upload Transfer Certificate
                        <input
                          type="file"
                          hidden
                          onChange={(e) =>
                            setPreviousTcFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </Button>
                      {previousTcFile ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => openSelectedFile(previousTcFile)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {previousTcFile.name}
                        </Link>
                      ) : savedTransferCertificate ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => openSavedDocument(savedTransferCertificate)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {savedTransferCertificate.filename}
                        </Link>
                      ) : null}
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFile />}
                      >
                        Upload Birth Certificate
                        <input
                          type="file"
                          hidden
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            setBirthCertificateFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </Button>
                      {birthCertificateFile ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => openSelectedFile(birthCertificateFile)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {birthCertificateFile.name}
                        </Link>
                      ) : savedBirthCertificate ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => openSavedDocument(savedBirthCertificate)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          {savedBirthCertificate.filename}
                        </Link>
                      ) : null}
                    </Box>
                  </Grid>
                </Grid>
              )}

              {dialogTab === 6 && (
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mt: 1,
                      }}
                    >
                      <Typography variant="subtitle2">Father</Typography>
                      <Autocomplete
                        size="small"
                        sx={{ width: 300 }}
                        freeSolo
                        options={guardianOptions}
                        getOptionLabel={(option) =>
                          typeof option === "string"
                            ? option
                            : `${option.full_name} (${option.phone || "-"})`
                        }
                        loading={guardianLoading}
                        onOpen={() => setGuardianSearchOpen(true)}
                        onClose={() => setGuardianSearchOpen(false)}
                        onInputChange={(_event, val) => setGuardianSearchInput(val)}
                        onChange={(_event, value) => {
                          if (value && typeof value !== "string") {
                            setFatherForm({
                              id: value.id,
                              full_name: value.full_name,
                              occupation: value.occupation || "",
                              phone: value.phone || "",
                              email: value.email || "",
                              id_number: value.id_number || "",
                              photo_url: value.photo_url || "",
                            });
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search Existing Father"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {guardianLoading ? (
                                    <CircularProgress
                                      color="inherit"
                                      size={20}
                                    />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      margin="normal"
                      value={fatherForm.full_name}
                      onChange={(e) =>
                        setFatherForm((p) => ({
                          ...p,
                          full_name: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Occupation"
                      fullWidth
                      margin="normal"
                      value={fatherForm.occupation}
                      onChange={(e) =>
                        setFatherForm((p) => ({
                          ...p,
                          occupation: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Phone"
                      fullWidth
                      margin="normal"
                      value={fatherForm.phone}
                      onChange={(e) =>
                        setFatherForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      margin="normal"
                      value={fatherForm.email}
                      onChange={(e) =>
                        setFatherForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="ID Number"
                      fullWidth
                      margin="normal"
                      value={fatherForm.id_number}
                      onChange={(e) =>
                        setFatherForm((p) => ({
                          ...p,
                          id_number: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFile />}
                    >
                      Father Photo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) =>
                          setFatherPhotoFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </Button>
                    {renderPersonPhotoPreview(
                      fatherPhotoFile,
                      fatherPhotoPreviewUrl,
                      fatherForm.photo_url,
                      "Father",
                    )}
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mt: 2,
                      }}
                    >
                      <Typography variant="subtitle2">Mother</Typography>
                      <Autocomplete
                        size="small"
                        sx={{ width: 300 }}
                        freeSolo
                        options={guardianOptions}
                        getOptionLabel={(option) =>
                          typeof option === "string"
                            ? option
                            : `${option.full_name} (${option.phone || "-"})`
                        }
                        loading={guardianLoading}
                        onOpen={() => setGuardianSearchOpen(true)}
                        onClose={() => setGuardianSearchOpen(false)}
                        onInputChange={(_event, val) => setGuardianSearchInput(val)}
                        onChange={(_event, value) => {
                          if (value && typeof value !== "string") {
                            setMotherForm({
                              id: value.id,
                              full_name: value.full_name,
                              occupation: value.occupation || "",
                              phone: value.phone || "",
                              email: value.email || "",
                              id_number: value.id_number || "",
                              photo_url: value.photo_url || "",
                            });
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search Existing Mother"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {guardianLoading ? (
                                    <CircularProgress
                                      color="inherit"
                                      size={20}
                                    />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      margin="normal"
                      value={motherForm.full_name}
                      onChange={(e) =>
                        setMotherForm((p) => ({
                          ...p,
                          full_name: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Occupation"
                      fullWidth
                      margin="normal"
                      value={motherForm.occupation}
                      onChange={(e) =>
                        setMotherForm((p) => ({
                          ...p,
                          occupation: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Phone"
                      fullWidth
                      margin="normal"
                      value={motherForm.phone}
                      onChange={(e) =>
                        setMotherForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      margin="normal"
                      value={motherForm.email}
                      onChange={(e) =>
                        setMotherForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="ID Number"
                      fullWidth
                      margin="normal"
                      value={motherForm.id_number}
                      onChange={(e) =>
                        setMotherForm((p) => ({
                          ...p,
                          id_number: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFile />}
                    >
                      Mother Photo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) =>
                          setMotherPhotoFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </Button>
                    {renderPersonPhotoPreview(
                      motherPhotoFile,
                      motherPhotoPreviewUrl,
                      motherForm.photo_url,
                      "Mother",
                    )}
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mt: 2,
                      }}
                    >
                      <Typography variant="subtitle2">Guardian</Typography>
                      <Autocomplete
                        size="small"
                        sx={{ width: 300 }}
                        freeSolo
                        options={guardianOptions}
                        getOptionLabel={(option) =>
                          typeof option === "string"
                            ? option
                            : `${option.full_name} (${option.phone || "-"})`
                        }
                        loading={guardianLoading}
                        onOpen={() => setGuardianSearchOpen(true)}
                        onClose={() => setGuardianSearchOpen(false)}
                        onInputChange={(_event, val) => setGuardianSearchInput(val)}
                        onChange={(_event, value) => {
                          if (value && typeof value !== "string") {
                            setGuardianForm({
                              id: value.id,
                              full_name: value.full_name,
                              relation: "guardian",
                              phone: value.phone || "",
                              email: value.email || "",
                              occupation: value.occupation || "",
                              id_number: value.id_number || "",
                              address: value.address || "",
                              photo_url: value.photo_url || "",
                            });
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search Existing Guardian"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {guardianLoading ? (
                                    <CircularProgress
                                      color="inherit"
                                      size={20}
                                    />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      margin="normal"
                      value={guardianForm.full_name}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          full_name: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Relation"
                      fullWidth
                      margin="normal"
                      value={guardianForm.relation}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          relation: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Phone"
                      fullWidth
                      margin="normal"
                      value={guardianForm.phone}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      margin="normal"
                      value={guardianForm.email}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Occupation"
                      fullWidth
                      margin="normal"
                      value={guardianForm.occupation}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          occupation: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="ID Number"
                      fullWidth
                      margin="normal"
                      value={guardianForm.id_number}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          id_number: e.target.value,
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Address"
                      fullWidth
                      margin="normal"
                      value={guardianForm.address}
                      onChange={(e) =>
                        setGuardianForm((p) => ({
                          ...p,
                          address: e.target.value,
                        }))
                      }
                      multiline
                      minRows={2}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFile />}
                    >
                      Guardian Photo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) =>
                          setGuardianPhotoFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </Button>
                    {renderPersonPhotoPreview(
                      guardianPhotoFile,
                      guardianPhotoPreviewUrl,
                      guardianForm.photo_url,
                      "Guardian",
                    )}
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveStudent}
            variant="contained"
            disabled={dialogSaving || dialogLoading}
          >
            {dialogSaving ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={Boolean(drawerStudentId)}
        onClose={() => setDrawerStudentId(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 520 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Avatar
                src={getFileUrl(drawerStudent?.photo_url)}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "primary.main",
                  fontSize: "1.5rem",
                }}
              >
                {drawerStudent?.first_name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {drawerStudent ? formatStudentName(drawerStudent) : "Student"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Admission: {drawerStudent?.admission_no || "-"} • ID:{" "}
                  {drawerStudentId}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {drawerStudent ? (
                <Chip
                  label={(drawerStudent.status || "-").toUpperCase()}
                  color={statusChipColor(drawerStudent.status || "")}
                  size="small"
                />
              ) : null}
              <IconButton
                size="small"
                onClick={() => {
                  if (!drawerStudent) return;
                  openEditDialog(drawerStudent);
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Tabs
            value={drawerTab}
            onChange={(_e, v) => setDrawerTab(v)}
            sx={{ mt: 2 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Profile" />
            <Tab label="Attendance" />
            <Tab label="Fees" />
            <Tab label="Timetable" />
          </Tabs>
        </Box>
        <Divider />

        {drawerLoading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {drawerTab === 0 && (
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Name
                    </Typography>
                    <Typography fontWeight={700}>
                      {drawerStudent ? formatStudentName(drawerStudent) : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Status
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {drawerStudent?.status || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {drawerStudent?.gender || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography fontWeight={700}>
                      {drawerStudent?.date_of_birth || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Admission Roll Number
                    </Typography>
                    <Typography fontWeight={700}>
                      {drawerEnrollment?.roll_number || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => {
                          if (drawerStudent)
                            handleDownloadIdCard(drawerStudent);
                        }}
                      >
                        ID Card
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (drawerStudent)
                            handleDeactivateStudent(drawerStudent);
                        }}
                        disabled={
                          drawerStudent?.status?.toLowerCase() !== "active"
                        }
                      >
                        Deactivate
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (drawerStudent)
                            handleEnableStudentPortalAccess(drawerStudent);
                        }}
                        disabled={
                          portalAccessSaving ||
                          Boolean(drawerStudent?.portal_access_student)
                        }
                      >
                        {portalAccessSaving ? (
                          <CircularProgress size={16} />
                        ) : drawerStudent?.portal_access_student ? (
                          "Portal Enabled"
                        ) : (
                          "Portal Access"
                        )}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {drawerTab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>
                    Attendance (Last 30 days)
                  </Typography>
                  {attendanceSummary ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {Object.entries(attendanceSummary)
                        .filter(([k]) => k !== "total")
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, v]) => (
                          <Chip
                            key={k}
                            label={`${k}: ${v}`}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                          />
                        ))}
                      <Chip
                        label={`Total: ${attendanceSummary.total ?? 0}`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      Attendance data is unavailable or you don’t have access.
                    </Typography>
                  )}
                </Paper>

                <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(attendanceRecords ?? [])
                        .slice(-20)
                        .reverse()
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.attendance_date}</TableCell>
                            <TableCell sx={{ textTransform: "capitalize" }}>
                              {r.status}
                            </TableCell>
                          </TableRow>
                        ))}
                      {!attendanceRecords || attendanceRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            sx={{ py: 4, textAlign: "center" }}
                          >
                            <Typography color="text.secondary">
                              No attendance records found for this period.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {drawerTab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>
                    Fee Dues
                  </Typography>
                  {feeDues ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {feeDues.slice(0, 6).map((d) => (
                        <Box
                          key={d.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography
                              fontWeight={700}
                              sx={{ textTransform: "capitalize" }}
                            >
                              {d.status}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {d.due_amount.toLocaleString()} • Paid:{" "}
                              {d.paid_amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${d.due_amount.toLocaleString()}`}
                            color={d.due_amount > 0 ? "warning" : "success"}
                            size="small"
                          />
                        </Box>
                      ))}
                      {feeDues.length === 0 ? (
                        <Typography color="text.secondary">
                          No dues found.
                        </Typography>
                      ) : null}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      Fee data is unavailable or you don’t have access.
                    </Typography>
                  )}
                </Paper>

                <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <Box sx={{ p: 2 }}>
                    <Typography fontWeight={800}>Recent Payments</Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(feePayments ?? []).slice(0, 10).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell>{p.amount.toLocaleString()}</TableCell>
                          <TableCell>{p.payment_method || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {!feePayments || feePayments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            sx={{ py: 4, textAlign: "center" }}
                          >
                            <Typography color="text.secondary">
                              No payments found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {drawerTab === 3 && (
              <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                  <Typography fontWeight={800}>Timetable</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shows schedule based on active enrollment.
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Room</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(timetable ?? []).slice(0, 30).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {dayLabels[t.day_of_week] ?? t.day_of_week}
                        </TableCell>
                        <TableCell>
                          {t.start_time} - {t.end_time}
                        </TableCell>
                        <TableCell>{t.room || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!timetable || timetable.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{ py: 4, textAlign: "center" }}
                        >
                          <Typography color="text.secondary">
                            No timetable found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
