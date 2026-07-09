import React, { useState } from "react";
import { Submission, SyncStatus } from "../types";

interface TeacherGradingProps {
  submissions: Submission[];
  onDeleteSubmission: (id: string) => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
}

export default function TeacherGrading({
  submissions,
  onDeleteSubmission,
  syncStatus,
  onTriggerSync,
}: TeacherGradingProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = submissions.filter(
    (s) =>
      s.studentId.includes(searchTerm) ||
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.submissionId.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">การให้คะแนนและสถิติ</h1>
          <p className="text-sm text-[#59413f] mt-1">
            รายงานผลการทำข้อสอบของนักเรียน รายละเอียดคะแนน และสถานะการบันทึกประวัติการส่งข้อสอบ
          </p>
        </div>
        
        {syncStatus.spreadsheetId && (
          <button
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing}
            className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer disabled:opacity-75 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
            <span>{syncStatus.isSyncing ? "กำลังบันทึกคะแนนลงไดรฟ์..." : "ซิงค์คะแนนลง Google Drive"}</span>
          </button>
        )}
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 shadow-sm">
        {/* Search Filter */}
        <div className="flex items-center gap-3 mb-6 relative max-w-md">
          <span className="material-symbols-outlined absolute left-4 text-[#8c706e] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัสนักเรียน, ชื่อ หรือวิชาที่สอบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#e0bfbc] outline-none text-sm text-[#251817] focus:border-[#8e171c]"
          />
        </div>

        {/* Scores Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e0bfbc]/30 text-xs font-bold text-[#8c706e] bg-[#fff8f7]">
                <th className="py-3 px-4">รหัสการส่ง</th>
                <th className="py-3 px-4">นักเรียน</th>
                <th className="py-3 px-4">ชั้นเรียน</th>
                <th className="py-3 px-4">วิชาที่สอบ</th>
                <th className="py-3 px-4 text-center">สัดส่วนคำตอบ</th>
                <th className="py-3 px-4 text-right">คะแนนสอบ</th>
                <th className="py-3 px-4 text-center">เวลาส่งสอบ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0bfbc]/20">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#59413f]">
                    ยังไม่มีรายงานการทำข้อสอบตามตัวกรองนี้
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const isPerfect = sub.score === sub.totalPoints;
                  return (
                    <tr key={sub.submissionId} className="hover:bg-[#fff8f7] transition-all text-xs">
                      <td className="py-3 px-4 font-mono font-bold text-[#8c706e]">
                        {sub.submissionId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#251817]">{sub.studentName}</div>
                        <div className="text-[10px] text-[#8c706e] font-mono">ID: {sub.studentId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#59413f]">{sub.studentClassName}</td>
                      <td className="py-3 px-4 font-bold text-[#251817]">{sub.examTitle}</td>
                      <td className="py-3 px-4 text-center text-[#59413f]">
                        {sub.answeredCount} / {sub.totalQuestions} ข้อ
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black text-sm ${isPerfect ? "text-[#8e171c]" : "text-[#8f4a46]"}`}>
                          {sub.score}
                        </span>
                        <span className="text-[10px] text-[#8c706e] font-bold"> / {sub.totalPoints}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-[#59413f]">
                        {new Date(sub.submittedAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm("คุณต้องการลบสิทธิ์หรือบันทึกผลคะแนนประวัติการส่งข้อสอบรายการนี้หรือไม่?")) {
                              onDeleteSubmission(sub.submissionId);
                            }
                          }}
                          className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                          title="ลบผลการส่ง"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
