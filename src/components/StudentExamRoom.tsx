import React, { useState, useEffect } from "react";
import { Student, Exam, Question, Submission } from "../types";

interface StudentExamRoomProps {
  student: Student;
  activeExams: Exam[];
  onExamSubmitted: (submission: Submission) => void;
  onGoBack: () => void;
}

export default function StudentExamRoom({
  student,
  activeExams,
  onExamSubmitted,
  onGoBack,
}: StudentExamRoomProps) {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // { questionId: selectedIndex }
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Filter only active exams
  const exams = activeExams.filter((e) => e.isActive);

  // Timer logic
  useEffect(() => {
    if (!isExamStarted || !selectedExam || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit when time's up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, selectedExam, secondsRemaining]);

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSecondsRemaining(exam.timeLimitMinutes * 60);
    setIsExamStarted(true);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitExam = (isTimeUp = false) => {
    if (!selectedExam) return;

    if (!isTimeUp) {
      const unansweredCount = selectedExam.questions.length - Object.keys(answers).length;
      let confirmMsg = "คุณแน่ใจหรือไม่ที่จะส่งข้อสอบ? เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้อีก";
      if (unansweredCount > 0) {
        confirmMsg = `คุณยังไม่ได้ตอบคำถามอีก ${unansweredCount} ข้อ แน่ใจหรือไม่ที่จะส่งข้อสอบในตอนนี้?`;
      }
      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) return;
    } else {
      alert("หมดเวลาทำข้อสอบ! ระบบจะทำการส่งข้อสอบของคุณโดยอัตโนมัติ");
    }

    // Calculate score
    let score = 0;
    let totalPoints = 0;
    selectedExam.questions.forEach((q) => {
      totalPoints += q.points;
      if (answers[q.id] === q.answerIndex) {
        score += q.points;
      }
    });

    const answeredCount = Object.keys(answers).length;

    // Generate Submission object
    const newSubmission: Submission = {
      submissionId: `EX-${Math.floor(100000 + Math.random() * 900000)}`,
      studentId: student.id,
      studentName: student.name,
      studentClassName: student.className,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      score: score,
      totalPoints: totalPoints,
      answeredCount: answeredCount,
      totalQuestions: selectedExam.questions.length,
      submittedAt: new Date().toISOString(),
      status: "สมบูรณ์",
    };

    onExamSubmitted(newSubmission);
  };

  if (!selectedExam) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff8f7] font-sans pt-24 px-6 pb-12 text-[#251817]">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 w-full z-50 bg-[#fff8f7] border-b border-[#e0bfbc]/30 h-16 flex items-center">
          <div className="flex justify-between items-center px-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8e171c] text-3xl">school</span>
              <span className="text-xl font-bold text-[#8e171c]">ChineseEdutest</span>
            </div>
            <div className="text-sm font-semibold text-[#59413f]">
              สวัสดี, <span className="text-[#8e171c]">{student.name}</span> ({student.id})
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full mt-6">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={onGoBack}
              className="flex items-center gap-1 text-sm text-[#8f4a46] hover:text-[#8e171c] font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              กลับสู่หน้าหลัก
            </button>
          </div>

          <h1 className="text-3xl font-bold text-[#251817] mb-2">เลือกรายวิชาที่ต้องการสอบ</h1>
          <p className="text-[#59413f] mb-8 text-sm">กรุณาเลือกวิชาที่เปิดอยู่เพื่อเริ่มการสอบ กรุณาเตรียมตัวให้พร้อมก่อนกดปุ่มเริ่มสอบ</p>

          {exams.length === 0 ? (
            <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-[64px] text-[#8c706e] opacity-40 mb-4">
                upcoming
              </span>
              <p className="text-lg font-bold text-[#251817]">ไม่มีข้อสอบที่เปิดให้บริการในขณะนี้</p>
              <p className="text-sm text-[#59413f] mt-1">กรุณารอครูผู้สอนเปิดใช้งานระบบสอบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <span className="px-3 py-1 bg-[#ffdad7] text-[#8e171c] font-bold text-xs rounded-full">
                        {exam.courseCode}
                      </span>
                      <span className="text-xs text-[#8c706e] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        {exam.timeLimitMinutes} นาที
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#251817] mb-2">{exam.title}</h3>
                    <p className="text-sm text-[#59413f] mb-6 line-clamp-3">{exam.description}</p>
                  </div>

                  <div className="border-t border-[#e0bfbc]/30 pt-4 flex items-center justify-between">
                    <span className="text-xs text-[#8c706e] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">help</span>
                      {exam.questions.length} ข้อถาม
                    </span>
                    <button
                      onClick={() => handleStartExam(exam)}
                      className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full font-bold text-sm transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer"
                    >
                      เริ่มทำข้อสอบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion: Question = selectedExam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / selectedExam.questions.length) * 100;
  const isTimeCritical = secondsRemaining <= 300; // Last 5 minutes

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] font-sans pt-16 text-[#251817]">
      {/* Top Sticky Progress & Timer Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-[#e0bfbc]/30 h-16 shadow-sm">
        <div className="flex justify-between items-center px-6 h-full w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#8e171c] bg-[#ffdad7] px-3 py-1 rounded-full">
              {selectedExam.courseCode}
            </span>
            <span className="font-bold text-sm text-[#251817] hidden sm:inline">{selectedExam.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-semibold text-[#59413f]">
              ผู้สอบ: <span className="text-[#8e171c] font-bold">{student.name}</span>
            </div>

            {/* Countdown Clock */}
            <div
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
                isTimeCritical ? "bg-[#ffdad6] text-[#ba1a1a] animate-pulse" : "bg-[#ffe9e7] text-[#8e171c]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">alarm</span>
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>
        </div>
        {/* Dynamic visual progress line */}
        <div className="w-full bg-[#fbe3e0] h-1.5">
          <div
            className="bg-[#8e171c] h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Testing Space */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
          
          {/* Question Grid Map Navigation */}
          <div className="md:col-span-1 bg-white border border-[#e0bfbc]/40 rounded-3xl p-5 h-fit shadow-sm">
            <h4 className="text-xs font-bold text-[#59413f] uppercase tracking-wider mb-4">ผังข้อสอบ</h4>
            <div className="grid grid-cols-4 gap-2">
              {selectedExam.questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#8e171c] text-white ring-4 ring-[#8e171c]/15 shadow-sm"
                        : isAnswered
                        ? "bg-[#ffd0cc] text-[#8e171c]"
                        : "bg-[#fff8f7] text-[#59413f] border border-[#e0bfbc]/60 hover:bg-[#ffe9e7]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[#e0bfbc]/20 space-y-2 text-[11px] text-[#59413f]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8e171c]"></span>
                <span>ข้อปัจจุบัน</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ffd0cc]"></span>
                <span>ตอบแล้ว ({answeredCount} ข้อ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#fff8f7] border border-[#e0bfbc]"></span>
                <span>ยังไม่ได้ทำ ({selectedExam.questions.length - answeredCount} ข้อ)</span>
              </div>
            </div>
          </div>

          {/* Current Active Question Display */}
          <div className="md:col-span-3 space-y-6">
            <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 md:p-8 shadow-sm relative">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-[#8c706e]">
                  คำถามที่ {currentQuestionIndex + 1} จาก {selectedExam.questions.length}
                </span>
                <span className="text-xs font-bold text-[#8e171c] bg-[#ffdad7] px-2.5 py-1 rounded-full">
                  {currentQuestion.points} คะแนน
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-xl md:text-2xl font-bold text-[#251817] mb-8 leading-relaxed">
                {currentQuestion.text}
              </h2>

              {/* Option Choices */}
              <div className="space-y-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === idx;
                  const optionLetters = ["A", "B", "C", "D", "E"];
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(currentQuestion.id, idx)}
                      className={`w-full text-left px-6 py-4 rounded-full border transition-all flex items-center gap-4 cursor-pointer text-sm font-medium ${
                        isSelected
                          ? "border-[#8e171c] bg-[#ffd0cc]/30 text-[#8e171c] ring-4 ring-[#8e171c]/10"
                          : "border-[#e0bfbc]/70 bg-white text-[#251817] hover:border-[#8e171c]/50 hover:bg-[#fff8f7]"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isSelected ? "bg-[#8e171c] text-white" : "bg-[#fbe3e0] text-[#8e171c]"
                        }`}
                      >
                        {optionLetters[idx]}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper controls */}
            <div className="flex justify-between items-center">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#e0bfbc] hover:bg-[#fff8f7] text-[#59413f] rounded-full font-bold text-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">navigate_before</span>
                ย้อนกลับ
              </button>

              {currentQuestionIndex < selectedExam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full font-bold text-sm transition-all cursor-pointer"
                >
                  ถัดไป
                  <span className="material-symbols-outlined text-[18px]">navigate_next</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSubmitExam(false)}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#ba1a1a] hover:bg-[#a01212] text-white rounded-full font-bold text-sm transition-all shadow-md shadow-[#ba1a1a]/15 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  ส่งข้อสอบทั้งหมด
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
