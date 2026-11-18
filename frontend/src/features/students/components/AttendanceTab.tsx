import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  BeachAccess,
  Cancel,
  CheckCircle,
  Download,
  People,
  Refresh,
  Schedule,
  Search,
  RestartAlt,
  Save,
  UploadFile,
} from "@mui/icons-material";
import {
  getCurrentAcademicYear,
  getClasses,
  getSections,
  type Section,
  type SchoolClass,
} from "../../../api/academic";
import {
  getEnrollmentsByStudents,
  getStudentAttendanceByDate,
  getStudents,
  markStudentAttendance,
  type Enrollment,
  type Student,
  type StudentAttendanceRecord,
} from "../../../api/people";

const getFileUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  if (path.startsWith("static/")) return `/${path}`;
  return `/static/${path}`;
};

const initialAttendanceStatus: Record<string, string> = {};

function sortRollNumbers(a?: string | null, b?: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function createXlsx(rows: string[][]) {
  const encoder = new TextEncoder();
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (cell, columnIndex) =>
              `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`,
          )
          .join("")}</row>`,
    )
    .join("");
  const files = [
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ];

  const output: number[] = [];
  const centralDirectory: number[] = [];
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const offset = output.length;
    const checksum = crc32(contentBytes);

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, contentBytes.length);
    writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, offset);
    centralDirectory.push(...nameBytes);
  });

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const requiredImportHeaders = [
  "Student Name",
  "Admission No",
  "Roll Number",
  "Class",
  "Section",
  "Attendance Date",
  "Status",
] as const;

type AttendanceImportColumn = (typeof requiredImportHeaders)[number];

type AttendanceImportRow = Record<AttendanceImportColumn, string>;

type DecompressionStreamConstructor = new (
  format: "deflate-raw",
) => TransformStream<Uint8Array, Uint8Array>;

function normalizeImportKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeCompareValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function getXmlChildText(element: Element, name: string) {
  const child = Array.from(element.getElementsByTagName("*")).find(
    (item) => item.localName === name,
  );
  return child?.textContent ?? "";
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function inflateRaw(bytes: Uint8Array) {
  const DecompressionStreamCtor = (
    globalThis as typeof globalThis & {
      DecompressionStream?: DecompressionStreamConstructor;
    }
  ).DecompressionStream;

  if (!DecompressionStreamCtor) {
    throw new Error(
      "This browser cannot read compressed XLSX files. Please import a CSV file.",
    );
  }

  const stream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStreamCtor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipTextEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  let eocdOffset = -1;

  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (readUint32(view, i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error("Invalid XLSX file.");

  const entryCount = readUint16(view, eocdOffset + 10);
  let centralOffset = readUint32(view, eocdOffset + 16);
  const entries: Record<string, string> = {};

  for (let i = 0; i < entryCount; i += 1) {
    if (readUint32(view, centralOffset) !== 0x02014b50) {
      throw new Error("Invalid XLSX central directory.");
    }

    const compression = readUint16(view, centralOffset + 10);
    const compressedSize = readUint32(view, centralOffset + 20);
    const fileNameLength = readUint16(view, centralOffset + 28);
    const extraLength = readUint16(view, centralOffset + 30);
    const commentLength = readUint16(view, centralOffset + 32);
    const localHeaderOffset = readUint32(view, centralOffset + 42);
    const fileName = decoder.decode(
      bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength),
    );

    const localNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraLength = readUint16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content: Uint8Array;

    if (compression === 0) {
      content = compressed;
    } else if (compression === 8) {
      content = await inflateRaw(compressed);
    } else {
      throw new Error("Unsupported XLSX compression method.");
    }

    entries[fileName] = decoder.decode(content);
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function parseSharedStrings(xml?: string) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("*"))
    .filter((item) => item.localName === "si")
    .map((item) =>
      Array.from(item.getElementsByTagName("*"))
        .filter((child) => child.localName === "t")
        .map((child) => child.textContent ?? "")
        .join(""),
    );
}

function columnIndexFromRef(ref: string) {
  const letters = ref.match(/[A-Z]+/i)?.[0].toUpperCase() ?? "";
  return letters.split("").reduce((acc, letter) => {
    return acc * 26 + letter.charCodeAt(0) - 64;
  }, 0) - 1;
}

function excelSerialDateToIso(value: string) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return value;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString().slice(0, 10);
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("*"))
    .filter((item) => item.localName === "row")
    .map((row) => {
      const cells: string[] = [];
      Array.from(row.children)
        .filter((item) => item.localName === "c")
        .forEach((cell, fallbackIndex) => {
          const ref = cell.getAttribute("r") || "";
          const index = ref ? columnIndexFromRef(ref) : fallbackIndex;
          const type = cell.getAttribute("t");
          const rawValue =
            type === "inlineStr"
              ? getXmlChildText(cell, "t")
              : getXmlChildText(cell, "v");
          const value =
            type === "s"
              ? sharedStrings[Number(rawValue)] || ""
              : excelSerialDateToIso(rawValue);
          cells[index] = value.trim();
        });
      return cells;
    })
    .filter((row) => row.some((cell) => (cell || "").trim()));
}

async function parseXlsxRows(file: File) {
  const entries = await readZipTextEntries(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(entries["xl/sharedStrings.xml"]);
  const sheetEntry =
    entries["xl/worksheets/sheet1.xml"] ||
    Object.entries(entries).find(([name]) =>
      /^xl\/worksheets\/sheet\d+\.xml$/.test(name),
    )?.[1];

  if (!sheetEntry) throw new Error("No worksheet found in XLSX file.");
  return parseWorksheetRows(sheetEntry, sharedStrings);
}

async function parseAttendanceImportFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const rows =
    extension === "xlsx"
      ? await parseXlsxRows(file)
      : parseCsvRows(await file.text());

  if (rows.length < 2) {
    throw new Error("Import file must include a header row and attendance rows.");
  }

  const headerMap = rows[0].reduce<Record<string, number>>((acc, header, index) => {
    acc[normalizeImportKey(header)] = index;
    return acc;
  }, {});
  const missingHeaders = requiredImportHeaders.filter(
    (header) => headerMap[normalizeImportKey(header)] === undefined,
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(", ")}.`);
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell?.trim()));
  const missingCells: string[] = [];
  const parsedRows = dataRows.map((row, index) => {
    const parsed = requiredImportHeaders.reduce((acc, header) => {
      acc[header] = (row[headerMap[normalizeImportKey(header)]] || "").trim();
      return acc;
    }, {} as AttendanceImportRow);

    requiredImportHeaders.forEach((header) => {
      if (!parsed[header]) missingCells.push(`Row ${index + 2}: ${header}`);
    });

    return parsed;
  });

  if (missingCells.length > 0) {
    throw new Error(
      `Please input data into Excel for: ${missingCells.slice(0, 12).join(", ")}${
        missingCells.length > 12 ? ", ..." : ""
      }.`,
    );
  }

  return parsedRows;
}

function normalizeAttendanceStatus(value: string) {
  const normalized = normalizeCompareValue(value);
  if (normalized === "p") return "present";
  if (normalized === "a") return "absent";
  if (normalized === "l") return "leave";
  if (["present", "absent", "leave"].includes(normalized)) return normalized;
  return "";
}

export default function AttendanceTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollmentByStudentId, setEnrollmentByStudentId] = useState<
    Record<string, Enrollment>
  >({});
  const [academicYearId, setAcademicYearId] = useState("");
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceTaken, setAttendanceTaken] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(
    initialAttendanceStatus,
  );
  const [savedStudentIds, setSavedStudentIds] = useState<Record<string, true>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const savedAttendanceCount = Object.keys(savedStudentIds).length;
  const hasUnsavedMarks = students.some(
    (student) => attendanceStatus[student.id] && !savedStudentIds[student.id],
  );

  const selectedClassName =
    classes.find((item) => item.id === classId)?.name || "-";
  const selectedSectionName =
    sections.find((item) => item.id === sectionId)?.name || "-";
  const classDateSelected = Boolean(classId && attendanceDate);

  const stats = useMemo(() => {
    const present = Object.values(attendanceStatus).filter(
      (value) => value === "present",
    ).length;
    const absent = Object.values(attendanceStatus).filter(
      (value) => value === "absent",
    ).length;
    const leave = Object.values(attendanceStatus).filter(
      (value) => value === "leave",
    ).length;
    const late = Object.values(attendanceStatus).filter(
      (value) => value === "late",
    ).length;

    return {
      total: classDateSelected ? students.length : 0,
      present,
      absent,
      leave,
      late,
    };
  }, [attendanceStatus, students.length, classDateSelected]);

  const cards = [
    {
      icon: <People />,
      value: stats.total,
      label: "Total Students",
      color: "#1976d2",
    },
    {
      icon: <CheckCircle />,
      value: stats.present,
      label: "Present",
      color: "#2e7d32",
    },
    {
      icon: <Cancel />,
      value: stats.absent,
      label: "Absent",
      color: "#d32f2f",
    },
    {
      icon: <BeachAccess />,
      value: stats.leave,
      label: "Leave",
      color: "#ed6c02",
    },
    {
      icon: <Schedule />,
      value: stats.late,
      label: "Late",
      color: "#9c27b0",
    },
  ];

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const aRoll = enrollmentByStudentId[a.id]?.roll_number;
      const bRoll = enrollmentByStudentId[b.id]?.roll_number;
      const rollCompare = sortRollNumbers(aRoll, bRoll);
      if (rollCompare !== 0) return rollCompare;
      return `${a.first_name} ${a.last_name || ""}`.localeCompare(
        `${b.first_name} ${b.last_name || ""}`,
      );
    });
  }, [enrollmentByStudentId, students]);

  const loadStudents = async () => {
    if (!classId || !attendanceDate) {
      setStudents([]);
      setEnrollmentByStudentId({});
      setAttendanceStatus({});
      setSavedStudentIds({});
      setAttendanceTaken(false);
      return;
    }

    setLoading(true);
    try {
      const [studentsRes, existingAttendance] = await Promise.all([
        getStudents({
          limit: 1000,
          search: search.trim() || undefined,
          class_id: classId,
          section_id: sectionId || undefined,
          status: "active",
        }),
        getStudentAttendanceByDate(attendanceDate, {
          class_id: classId,
          section_id: sectionId || undefined,
        }).catch(() => [] as StudentAttendanceRecord[]),
      ]);
      const selectedStudents = studentsRes.items;
      const selectedStudentIds = new Set(
        selectedStudents.map((student) => student.id),
      );
      const existingForSelectedStudents = existingAttendance.filter((record) =>
        selectedStudentIds.has(record.student_id),
      );
      const isFullyTaken =
        selectedStudents.length > 0 &&
        existingForSelectedStudents.length >= selectedStudents.length;
      setStudents(selectedStudents);

      const statusMap = existingForSelectedStudents.reduce<Record<string, string>>(
        (acc, record) => {
          acc[record.student_id] = record.is_late ? "late" : record.status;
          return acc;
        },
        {},
      );
      const savedMap = existingForSelectedStudents.reduce<Record<string, true>>(
        (acc, record) => {
          acc[record.student_id] = true;
          return acc;
        },
        {},
      );
      // Keep biometric and previously saved records visible while a teacher
      // completes remaining students on the same date.
      setAttendanceStatus(statusMap);
      setSavedStudentIds(savedMap);
      setAttendanceTaken(isFullyTaken);
    } catch (error) {
      console.error("Failed to load student attendance list", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [classList, currentYear] = await Promise.all([
          getClasses(),
          getCurrentAcademicYear().catch(() => null),
        ]);
        setClasses(classList.filter((item) => item.is_active));
        setAcademicYearId(currentYear?.id ?? "");
      } catch (error) {
        console.error("Failed to load attendance metadata", error);
      }
    }

    loadMetadata();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [attendanceDate, classId, search, sectionId]);

  useEffect(() => {
    async function loadSections() {
      if (!classId) {
        setSections([]);
        setSectionId("");
        return;
      }

      try {
        const list = await getSections(classId);
        const active = list.filter((item) => item.is_active);
        setSections(active);
        if (sectionId && !active.some((item) => item.id === sectionId)) {
          setSectionId("");
        }
      } catch (error) {
        console.error("Failed to load class sections", error);
      }
    }

    loadSections();
  }, [classId, sectionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadEnrollments() {
      if (students.length === 0) {
        setEnrollmentByStudentId({});
        return;
      }

      const enrollments = await getEnrollmentsByStudents(
        students.map((student) => student.id),
        academicYearId || undefined,
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
  }, [academicYearId, students]);

  const handleImportAttendanceFile = async (file: File) => {
    if (!classId || !attendanceDate) {
      window.alert("Select Class and Attendance Date before import.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSaving(true);
    try {
      const importedRows = await parseAttendanceImportFile(file);
      const selectedClass = classes.find((item) => item.id === classId);
      const selectedSection = sectionId
        ? sections.find((item) => item.id === sectionId)
        : undefined;

      if (!selectedClass) {
        window.alert("Selected Class was not found.");
        return;
      }

      if (sectionId && !selectedSection) {
        window.alert("Selected Section was not found.");
        return;
      }

      const invalidFilterRows = importedRows
        .map((row, index) => ({ row, rowNumber: index + 2 }))
        .filter(({ row }) => {
          return (
            normalizeCompareValue(row.Class) !==
              normalizeCompareValue(selectedClass.name) ||
            (selectedSection &&
              normalizeCompareValue(row.Section) !==
                normalizeCompareValue(selectedSection.name)) ||
            row["Attendance Date"] !== attendanceDate
          );
        });

      if (invalidFilterRows.length > 0) {
        window.alert(
          `Import file must match selected Class${
            selectedSection ? ", Section" : ""
          }, and Attendance Date. Check row ${invalidFilterRows[0].rowNumber}.`,
        );
        return;
      }

      const invalidStatuses = importedRows
        .map((row, index) => ({
          rowNumber: index + 2,
          status: row.Status,
          normalized: normalizeAttendanceStatus(row.Status),
        }))
        .filter((row) => !row.normalized);

      if (invalidStatuses.length > 0) {
        window.alert(
          `Invalid Status in row ${invalidStatuses[0].rowNumber}. Use present, absent, or leave.`,
        );
        return;
      }

      const [studentsRes, existingAttendance] = await Promise.all([
        getStudents({
          limit: 1000,
          class_id: classId,
          section_id: sectionId || undefined,
          status: "active",
        }),
        getStudentAttendanceByDate(attendanceDate, {
          class_id: classId,
          section_id: sectionId || undefined,
        }).catch(() => [] as StudentAttendanceRecord[]),
      ]);
      const selectedStudents = studentsRes.items;
      const selectedStudentIds = new Set(
        selectedStudents.map((student) => student.id),
      );
      const existingForSelectedStudents = existingAttendance.filter((record) =>
        selectedStudentIds.has(record.student_id),
      );

      if (
        selectedStudents.length > 0 &&
        existingForSelectedStudents.length >= selectedStudents.length
      ) {
        setStudents(selectedStudents);
        setAttendanceStatus(
          existingForSelectedStudents.reduce<Record<string, string>>(
            (acc, record) => {
              acc[record.student_id] = record.is_late ? "late" : record.status;
              return acc;
            },
            {},
          ),
        );
        setSavedStudentIds(
          existingForSelectedStudents.reduce<Record<string, true>>(
            (acc, record) => {
              acc[record.student_id] = true;
              return acc;
            },
            {},
          ),
        );
        setAttendanceTaken(true);
        window.alert("Already this date attendance taken.");
        return;
      }

      const enrollments = await getEnrollmentsByStudents(
        selectedStudents.map((student) => student.id),
        academicYearId || undefined,
      ).catch(() => []);
      const nextEnrollmentMap = enrollments.reduce<Record<string, Enrollment>>(
        (acc, enrollment) => {
          acc[enrollment.student_id] = enrollment;
          return acc;
        },
        {},
      );
      const studentsByAdmission = new Map(
        selectedStudents
          .filter((student) => student.admission_no)
          .map((student) => [
            normalizeCompareValue(student.admission_no || ""),
            student,
          ]),
      );
      const studentsByRoll = new Map(
        selectedStudents
          .map((student) => ({
            student,
            roll: nextEnrollmentMap[student.id]?.roll_number || "",
          }))
          .filter(({ roll }) => roll)
          .map(({ student, roll }) => [normalizeCompareValue(roll), student]),
      );
      const seenStudentIds = new Set<string>();
      const nextStatusMap = selectedStudents.reduce<Record<string, string>>(
        (acc, student) => {
          acc[student.id] = "absent";
          return acc;
        },
        {},
      );

      for (const [index, row] of importedRows.entries()) {
        const student =
          studentsByAdmission.get(normalizeCompareValue(row["Admission No"])) ||
          studentsByRoll.get(normalizeCompareValue(row["Roll Number"]));

        if (!student) {
          window.alert(
            `Row ${index + 2}: Student not found for Admission No ${row["Admission No"]} or Roll Number ${row["Roll Number"]}.`,
          );
          return;
        }

        if (seenStudentIds.has(student.id)) {
          window.alert(`Row ${index + 2}: Duplicate student attendance row.`);
          return;
        }

        seenStudentIds.add(student.id);
        nextStatusMap[student.id] = normalizeAttendanceStatus(row.Status);
      }

      await markStudentAttendance({
        attendance_date: attendanceDate,
        class_id: classId,
        section_id: sectionId || null,
        items: selectedStudents.map((student) => ({
          student_id: student.id,
          status: nextStatusMap[student.id],
        })),
      });

      setSearch("");
      setStudents(selectedStudents);
      setEnrollmentByStudentId(nextEnrollmentMap);
      setAttendanceStatus(nextStatusMap);
      setSavedStudentIds(
        selectedStudents.reduce<Record<string, true>>((acc, student) => {
          acc[student.id] = true;
          return acc;
        }, {}),
      );
      setAttendanceTaken(true);
      window.alert("Attendance imported and saved successfully.");
    } catch (error) {
      console.error("Failed to import student attendance", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to import attendance file.",
      );
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportCsv = () => {
    if (!attendanceTaken) return;

    const rows = [
      ["Student Name", "Admission No", "Roll Number", "Class", "Section", "Attendance Date", "Status"],
      ...sortedStudents.map((student) => [
        [student.first_name, student.last_name].filter(Boolean).join(" "),
        student.admission_no || "",
        enrollmentByStudentId[student.id]?.roll_number || "",
        selectedClassName,
        selectedSectionName,
        attendanceDate,
        attendanceStatus[student.id] || "unmarked",
      ]),
    ];
    const blob = createXlsx(rows);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-attendance-${attendanceDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = (studentId: string, nextStatus: string) => {
    if (attendanceTaken || savedStudentIds[studentId]) return;
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: nextStatus }));
  };

  const handleSaveAttendance = async () => {
    if (!classId || !attendanceDate || students.length === 0) return;

    const newlyMarked = students.filter(
      (student) => attendanceStatus[student.id] && !savedStudentIds[student.id],
    );
    if (newlyMarked.length === 0) {
      window.alert("Please mark attendance for at least one student before saving.");
      return;
    }

    setSaving(true);
    try {
      const existingAttendance = await getStudentAttendanceByDate(
        attendanceDate,
        {
          class_id: classId,
          section_id: sectionId || undefined,
        },
      ).catch(() => [] as StudentAttendanceRecord[]);
      const selectedStudentIds = new Set(students.map((student) => student.id));
      const existingForSelectedStudents = existingAttendance.filter((record) =>
        selectedStudentIds.has(record.student_id),
      );

      if (existingForSelectedStudents.length >= students.length) {
        setAttendanceStatus(
          existingForSelectedStudents.reduce<Record<string, string>>(
            (acc, record) => {
              acc[record.student_id] = record.is_late ? "late" : record.status;
              return acc;
            },
            {},
          ),
        );
        setSavedStudentIds(
          existingForSelectedStudents.reduce<Record<string, true>>(
            (acc, record) => {
              acc[record.student_id] = true;
              return acc;
            },
            {},
          ),
        );
        setAttendanceTaken(true);
        window.alert("Already this date attendance taken.");
        return;
      }

      await markStudentAttendance({
        attendance_date: attendanceDate,
        class_id: classId,
        section_id: sectionId || null,
        items: newlyMarked.map((student) => ({
          student_id: student.id,
          status: attendanceStatus[student.id],
        })),
      });

      const nextSavedIds = newlyMarked.reduce<Record<string, true>>(
        (acc, student) => {
          acc[student.id] = true;
          return acc;
        },
        { ...savedStudentIds },
      );
      setSavedStudentIds(nextSavedIds);
      setAttendanceTaken(students.every((student) => nextSavedIds[student.id]));
    } catch (error) {
      console.error("Failed to save student attendance", error);
      window.alert("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSearch("");
    setClassId("");
    setSectionId("");
    setAttendanceDate("");
    setStudents([]);
    setSections([]);
    setEnrollmentByStudentId({});
    setAttendanceStatus({});
    setSavedStudentIds({});
    setAttendanceTaken(false);
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((stat) => (
          <Card
            key={stat.label}
            sx={{
              background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}08 100%)`,
              border: `1px solid ${stat.color}30`,
            }}
          >
            <CardContent
              sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}
            >
              <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        sx={{
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fff",
        }}
        elevation={2}
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportAttendanceFile(f);
              }}
            />

            <Tooltip title="Bulk Import">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving || !classId || !attendanceDate}
                sx={{ bgcolor: "white", border: "1px solid #E0E0E0" }}
              >
                <UploadFile fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Excel">
              <IconButton
                size="small"
                onClick={handleExportCsv}
                disabled={!attendanceTaken}
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
            borderBottom: "1px solid #F0F0F0",
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
              {classes.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
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
              {sections.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="Attendance Date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveAttendance}
              disabled={
                saving ||
                attendanceTaken ||
                !hasUnsavedMarks ||
                !classId ||
                !attendanceDate ||
                students.length === 0
              }
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={handleReset}
              disabled={saving}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Reset
            </Button>
          </Box>
        </Box>

        {attendanceTaken ? (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            Attendance data has been processed for this date. Hikvision Present,
            Late, and Absent records saved in the database are shown below.
          </Alert>
        ) : savedAttendanceCount > 0 ? (
          <Alert severity="success" sx={{ borderRadius: 0 }}>
            Attendance saved for {savedAttendanceCount} student
            {savedAttendanceCount === 1 ? "" : "s"}. Mark remaining students and
            save again for this date.
          </Alert>
        ) : null}

        {/* List Content */}
        <Box sx={{ flex: 1, overflow: "auto", p: 0 }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 240,
              }}
            >
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              {classId && attendanceDate
                ? "No students found."
                : "Select Class and Attendance Date to take attendance."}
            </Box>
          ) : (
            <Box>
              {sortedStudents.map((student) => {
                const current = attendanceStatus[student.id] || "unmarked";
                const enrollment = enrollmentByStudentId[student.id];
                const alreadySaved = Boolean(savedStudentIds[student.id]);

                return (
                  <Box
                    key={student.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      borderBottom: "1px solid #F5F5F5",
                      "&:hover": { bgcolor: "#F8FAFC" },
                    }}
                  >
                    {/* Avatar & Info */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Avatar
                        src={getFileUrl(student.photo_url)}
                        sx={{ bgcolor: "#E3F2FD", color: "#1976D2" }}
                      >
                        {student.first_name?.[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {student.first_name} {student.last_name || ""}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {student.admission_no || "No admission no"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ width: 170, mr: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Roll Number
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {enrollment?.roll_number || "-"}
                      </Typography>
                    </Box>

                    <Box sx={{ width: 110, mr: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Class
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedClassName}
                      </Typography>
                    </Box>

                    <Box sx={{ width: 110, mr: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Section
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedSectionName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, mr: 2 }}>
                      <Chip
                        label={current === "late" ? "present" : current}
                        size="small"
                        color={
                          current === "present" || current === "late"
                            ? "success"
                            : current === "absent"
                              ? "error"
                              : current === "leave"
                                ? "warning"
                                : current === "late"
                                  ? "secondary"
                                : "default"
                        }
                        sx={{ textTransform: "capitalize", minWidth: 86 }}
                      />
                      {current === "late" ? <Chip label="Late" size="small" color="secondary" sx={{ minWidth: 64 }} /> : null}
                    </Box>

                    {/* Status Actions */}
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <StatusButton
                        current={current}
                        target="present"
                        label="P"
                        color="success"
                        onClick={() => handleStatusChange(student.id, "present")}
                        disabled={attendanceTaken || alreadySaved}
                      />
                      <StatusButton
                        current={current}
                        target="leave"
                        label="L"
                        color="warning"
                        onClick={() => handleStatusChange(student.id, "leave")}
                        disabled={attendanceTaken || alreadySaved}
                      />
                      <StatusButton
                        current={current}
                        target="absent"
                        label="A"
                        color="error"
                        onClick={() => handleStatusChange(student.id, "absent")}
                        disabled={attendanceTaken || alreadySaved}
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

function StatusButton({
  current,
  target,
  label,
  color,
  onClick,
  disabled,
}: {
  current: string;
  target: string;
  label: string;
  color: "success" | "warning" | "error";
  onClick: () => void;
  disabled?: boolean;
}) {
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
        border: active ? "none" : "1px solid #E0E0E0",
        "&:hover": { bgcolor: active ? `${color}.dark` : "#F5F5F5" },
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
