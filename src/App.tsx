import React, { useState, useEffect } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "./types";
import {
  DEFAULT_STUDENTS,
  DEFAULT_EXAMS,
  DEFAULT_SETTINGS,
  DEFAULT_SUBMISSIONS,
} from "./lib/mockData";
import { initAuth, getAccessToken, logout, googleSignIn } from "./lib/firebase";
import {
  searchDatabaseSpreadsheet,
  createDatabaseSpreadsheet,
  syncLocalToSheets,
  fetchFromSheets,
} from "./lib/googleSheets";

// Components
import StudentWelcome from "./components/StudentWelcome";
import StudentExamRoom from "./components/StudentExamRoom";
import ExamSuccess from "./components/ExamSuccess";
import StudentScoreLookup from "./components/StudentScoreLookup";
import TeacherLogin from "./components/TeacherLogin";
import TeacherDashboard from "./components/TeacherDashboard";

type Screen =
  | "student_welcome"
  | "student_exam"
  | "student_success"
  | "student_score_lookup"
  | "teacher_login"
  | "teacher_dashboard";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("student_welcome");

  // Local State
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    lastSyncedAt: null,
    isSyncing: false,
    error: null,
  });

  // User sessions
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [isOAuthConnected, setIsOAuthConnected] = useState(false);

  // 1. Initial State Load from LocalStorage
  useEffect(() => {
    const localStudents = localStorage.getItem("exam_students");
    const localExams = localStorage.getItem("exam_exams");
    const localSubmissions = localStorage.getItem("exam_submissions");
    const localSettings = localStorage.getItem("exam_settings");
    const localSync = localStorage.getItem("exam_sync_status");

    if (localStudents) {
      setStudents(JSON.parse(localStudents));
    } else {
      setStudents(DEFAULT_STUDENTS);
      localStorage.setItem("exam_students", JSON.stringify(DEFAULT_STUDENTS));
    }

    if (localExams) {
      setExams(JSON.parse(localExams));
    } else {
      setExams(DEFAULT_EXAMS);
      localStorage.setItem("exam_exams", JSON.stringify(DEFAULT_EXAMS));
    }

    if (localSubmissions) {
      setSubmissions(JSON.parse(localSubmissions));
    } else {
      setSubmissions(DEFAULT_SUBMISSIONS);
      localStorage.setItem("exam_submissions", JSON.stringify(DEFAULT_SUBMISSIONS));
    }

    if (localSettings) {
      setSettings(JSON.parse(localSettings));
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("exam_settings", JSON.stringify(DEFAULT_SETTINGS));
    }

    if (localSync) {
      setSyncStatus(JSON.parse(localSync));
    }
  }, []);

  // 2. Local State Persister
  const saveStateToLocal = (
    updatedStudents?: Student[],
    updatedExams?: Exam[],
    updatedSubmissions?: Submission[],
    updatedSettings?: SystemSettings
  ) => {
    if (updatedStudents) {
      setStudents(updatedStudents);
      localStorage.setItem("exam_students", JSON.stringify(updatedStudents));
    }
    if (updatedExams) {
      setExams(updatedExams);
      localStorage.setItem("exam_exams", JSON.stringify(updatedExams));
    }
    if (updatedSubmissions) {
      setSubmissions(updatedSubmissions);
      localStorage.setItem("exam_submissions", JSON.stringify(updatedSubmissions));
    }
    if (updatedSettings) {
      setSettings(updatedSettings);
      localStorage.setItem("exam_settings", JSON.stringify(updatedSettings));
    }
  };

  // 3. Google Drive / Sheets Synchronizer
  const handleFullSync = async (forceToken?: string) => {
    const token = forceToken || getAccessToken();
    if (!token) {
      setSyncStatus((prev) => ({ ...prev, error: "ไม่มีความถูกต้องของผู้มีสิทธิ์" }));
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Step A: Search for the spreadsheet
      let sheetId = syncStatus.spreadsheetId;
      let sheetUrl = syncStatus.spreadsheetUrl;

      if (!sheetId) {
        sheetId = await searchDatabaseSpreadsheet(token);
      }

      // Step B: Create if missing
      if (!sheetId) {
        const createResult = await createDatabaseSpreadsheet(token);
        sheetId = createResult.spreadsheetId;
        sheetUrl = createResult.spreadsheetUrl;
      }

      if (!sheetId) {
        throw new Error("ล้มเหลวในการดึงข้อมูลหรือจัดสร้างสเปรดชีต");
      }

      // Read current localStorage values
      const currentLocals = {
        students: JSON.parse(localStorage.getItem("exam_students") || "[]"),
        exams: JSON.parse(localStorage.getItem("exam_exams") || "[]"),
        submissions: JSON.parse(localStorage.getItem("exam_submissions") || "[]"),
        settings: JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)),
      };

      // Step C: Try to fetch sheet data first to merge (if sheet existed and has data)
      const fetched = await fetchFromSheets(token, sheetId);
      let mergedStudents = currentLocals.students;
      let mergedExams = currentLocals.exams;
      let mergedSubmissions = currentLocals.submissions;
      let mergedSettings = currentLocals.settings;

      if (fetched) {
        // Merge Students (favor local, add unique ones from sheets, or vice-versa)
        // For simplicity, we merge unique elements by ID
        const studentMap = new Map(currentLocals.students.map((s: Student) => [s.id, s]));
        fetched.students.forEach((s) => studentMap.set(s.id, s));
        mergedStudents = Array.from(studentMap.values());

        // Merge Exams
        const examMap = new Map(currentLocals.exams.map((e: Exam) => [e.id, e]));
        fetched.exams.forEach((e) => examMap.set(e.id, e));
        mergedExams = Array.from(examMap.values());

        // Merge Submissions
        const subMap = new Map(currentLocals.submissions.map((s: Submission) => [s.submissionId, s]));
        fetched.submissions.forEach((s) => subMap.set(s.submissionId, s));
        mergedSubmissions = Array.from(subMap.values());

        // Merge Settings
        mergedSettings = { ...currentLocals.settings, ...fetched.settings };
      }

      // Update states and local storage with the merged items
      saveStateToLocal(mergedStudents, mergedExams, mergedSubmissions, mergedSettings);

      // Step D: Write clean merged state back to Sheets
      await syncLocalToSheets(
        token,
        sheetId,
        mergedStudents,
        mergedExams,
        mergedSubmissions,
        mergedSettings
      );

      const nextSync: SyncStatus = {
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
        error: null,
      };

      setSyncStatus(nextSync);
      localStorage.setItem("exam_sync_status", JSON.stringify(nextSync));
    } catch (err: any) {
      console.error("Full Sync Error:", err);
      const nextSync: SyncStatus = {
        ...syncStatus,
        isSyncing: false,
        error: err?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล",
      };
      setSyncStatus(nextSync);
      localStorage.setItem("exam_sync_status", JSON.stringify(nextSync));
    }
  };

  // 4. Auth Auto-reconnect initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsOAuthConnected(true);
        setTeacherEmail(user.email || "");
        // If we have a spreadsheet ID, pull up-to-date data or push queued data
        handleFullSync(token);
      },
      () => {
        setIsOAuthConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Student Entering Exam Room
  const handleEnterExamRoom = (studentId: string) => {
    const studentObj = students.find((s) => s.id === studentId);
    if (studentObj) {
      setCurrentStudent(studentObj);
      setCurrentScreen("student_exam");
    }
  };

  // Student Submitting Exam
  const handleExamSubmitted = (submission: Submission) => {
    // Append to local state & persist
    const nextSubmissions = [submission, ...submissions];
    saveStateToLocal(undefined, undefined, nextSubmissions);
    setLatestSubmission(submission);
    setCurrentScreen("student_success");

    // Attempt to background-sync to Google Drive if connected
    if (isOAuthConnected) {
      setTimeout(() => {
        handleFullSync();
      }, 500);
    }
  };

  // Manual Trigger Google Sheet authentication popup
  const handleConnectGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsOAuthConnected(true);
        setTeacherEmail(result.user.email || "");
        handleFullSync(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google sync authorization cancelled:", err);
      setSyncStatus((prev) => ({
        ...prev,
        error: err?.message || "การตรวจสอบสิทธิ์ล้มเหลว หรือ ป๊อปอัพถูกบล็อก"
      }));
    }
  };

  // Teacher Logging In
  const handleTeacherLoginSuccess = (email: string, oauthConnected: boolean) => {
    setTeacherEmail(email);
    setIsOAuthConnected(oauthConnected);
    setCurrentScreen("teacher_dashboard");
    if (oauthConnected) {
      handleFullSync();
    }
  };

  // Teacher Logging Out
  const handleTeacherLogout = async () => {
    if (window.confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      await logout();
      setIsOAuthConnected(false);
      setTeacherEmail("");
      setCurrentScreen("student_welcome");
    }
  };

  // Default bulk roster data populator
  const handleBulkLoadDefaults = () => {
    if (window.confirm("คุณแน่ใจที่จะคืนค่ารายชื่อนักเรียนเริ่มต้นทั้งหมดหรือไม่?")) {
      saveStateToLocal(DEFAULT_STUDENTS);
    }
  };

  // Clear roster
  const handleClearRoster = () => {
    saveStateToLocal([]);
  };

  return (
    <div className="min-h-screen">
      {/* 1. STUDENT WELCOME SCREEN */}
      {currentScreen === "student_welcome" && (
        <StudentWelcome
          students={students}
          onEnterExamRoom={handleEnterExamRoom}
          onGoToTeacherLogin={() => setCurrentScreen("teacher_login")}
          onGoToScoreLookup={() => setCurrentScreen("student_score_lookup")}
        />
      )}

      {/* 2. STUDENT ACTIVE EXAM CENTER */}
      {currentScreen === "student_exam" && currentStudent && (
        <StudentExamRoom
          student={currentStudent}
          activeExams={exams}
          onExamSubmitted={handleExamSubmitted}
          onGoBack={() => {
            setCurrentStudent(null);
            setCurrentScreen("student_welcome");
          }}
        />
      )}

      {/* 3. STUDENT EXAM SUBMISSION SUCCESS */}
      {currentScreen === "student_success" && latestSubmission && (
        <ExamSuccess
          submission={latestSubmission}
          onGoHome={() => {
            setCurrentStudent(null);
            setLatestSubmission(null);
            setCurrentScreen("student_welcome");
          }}
          onCheckStatus={() => {
            setCurrentScreen("student_score_lookup");
          }}
        />
      )}

      {/* 4. STUDENT INDIVIDUAL SCORE LOOKUP */}
      {currentScreen === "student_score_lookup" && (
        <StudentScoreLookup
          students={students}
          submissions={submissions}
          onGoBack={() => {
            setCurrentStudent(null);
            setLatestSubmission(null);
            setCurrentScreen("student_welcome");
          }}
        />
      )}

      {/* 5. TEACHER LOGIN CENTER */}
      {currentScreen === "teacher_login" && (
        <TeacherLogin
          onLoginSuccess={handleTeacherLoginSuccess}
          onGoBack={() => setCurrentScreen("student_welcome")}
        />
      )}

      {/* 6. TEACHER ADMINISTRATIVE DASHBOARD */}
      {currentScreen === "teacher_dashboard" && (
        <TeacherDashboard
          teacherEmail={teacherEmail}
          students={students}
          onAddStudent={(newStudent) => {
            const next = [newStudent, ...students];
            saveStateToLocal(next);
          }}
          onDeleteStudent={(id) => {
            const next = students.filter((s) => s.id !== id);
            saveStateToLocal(next);
          }}
          onBulkLoadDefaults={handleBulkLoadDefaults}
          onClearRoster={handleClearRoster}
          exams={exams}
          onAddExam={(newExam) => {
            const next = [newExam, ...exams];
            saveStateToLocal(undefined, next);
          }}
          onDeleteExam={(id) => {
            const next = exams.filter((e) => e.id !== id);
            saveStateToLocal(undefined, next);
          }}
          onToggleActive={(id) => {
            const next = exams.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e));
            saveStateToLocal(undefined, next);
          }}
          submissions={submissions}
          onDeleteSubmission={(id) => {
            const next = submissions.filter((s) => s.submissionId !== id);
            saveStateToLocal(undefined, undefined, next);
          }}
          settings={settings}
          onUpdateSettings={(newSettings) => {
            saveStateToLocal(undefined, undefined, undefined, newSettings);
          }}
          onDiscardSettings={() => {
            setSettings(JSON.parse(localStorage.getItem("exam_settings") || JSON.stringify(DEFAULT_SETTINGS)));
          }}
          syncStatus={syncStatus}
          onTriggerSync={() => handleFullSync()}
          onConnectGoogle={handleConnectGoogle}
          onLogout={handleTeacherLogout}
        />
      )}
    </div>
  );
}
