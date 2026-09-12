import React, { useState, useMemo } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Search,
  Download,
  Filter,
  ArrowUpRight,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { WithdrawalRecord } from "../utils/referralStore";

interface AdminPayoutRequestsQueueProps {
  withdrawals: WithdrawalRecord[];
  onApproveClick: (record: WithdrawalRecord) => void;
  onRejectClick: (record: WithdrawalRecord) => void;
  onInspectStudent?: (studentId: string) => void;
  onToast?: (message: string, type?: "success" | "info" | "error") => void;
}

export const AdminPayoutRequestsQueue: React.FC<AdminPayoutRequestsQueueProps> = ({
  withdrawals,
  onApproveClick,
  onRejectClick,
  onInspectStudent,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "successful" | "rejected">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Aggregated quick stats
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let paidAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    for (const w of withdrawals) {
      if (w.status === "pending" || w.status === "processing") {
        pendingCount += 1;
        pendingAmount += w.amount;
      } else if (w.status === "successful") {
        paidCount += 1;
        paidAmount += w.amount;
      } else if (w.status === "rejected") {
        rejectedCount += 1;
        rejectedAmount += w.amount;
      }
    }

    return {
      pendingCount,
      pendingAmount,
      paidCount,
      paidAmount,
      rejectedCount,
      rejectedAmount,
      totalCount: withdrawals.length,
    };
  }, [withdrawals]);

  // Filtered withdrawal list
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      // Status filter
      if (statusFilter === "pending" && w.status !== "pending" && w.status !== "processing") {
        return false;
      }
      if (statusFilter === "successful" && w.status !== "successful") {
        return false;
      }
      if (statusFilter === "rejected" && w.status !== "rejected") {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (w.studentName || "").toLowerCase().includes(q);
        const matchUpi = (w.upiId || "").toLowerCase().includes(q);
        const matchRef = (w.referenceId || "").toLowerCase().includes(q);
        const matchUtr = (w.utrNumber || "").toLowerCase().includes(q);
        const matchEmail = (w.studentEmail || "").toLowerCase().includes(q);
        return matchName || matchUpi || matchRef || matchUtr || matchEmail;
      }

      return true;
    });
  }, [withdrawals, statusFilter, searchQuery]);

  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onToast?.(`Copied ${label}: ${text} 📋`, "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    if (filteredWithdrawals.length === 0) {
      onToast?.("No payout records to export.", "info");
      return;
    }

    const headers = [
      "Request ID",
      "Date",
      "Student Name",
      "Student Email",
      "Grade",
      "UPI ID",
      "Amount (INR)",
      "Status",
      "UTR / Reference Number",
      "Rejection Reason",
      "Processed At",
    ];

    const rows = filteredWithdrawals.map((w) => [
      `"${w.referenceId}"`,
      `"${w.date}"`,
      `"${w.studentName || "Scholar"}"`,
      `"${w.studentEmail || ""}"`,
      `"${w.grade || ""}"`,
      `"${w.upiId}"`,
      w.amount,
      `"${w.status}"`,
      `"${w.utrNumber || ""}"`,
      `"${w.rejectionReason || ""}"`,
      `"${w.processedAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cherry_AI_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast?.("Exported payouts CSV successfully! 📊", "success");
  };

  return (
    <div className="space-y-3.5">
      {/* 3 Quick Action / Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Pending Action Required */}
        <div
          onClick={() => setStatusFilter("pending")}
          className={`rounded-2xl p-3.5 border transition-all cursor-pointer shadow-xs ${
            statusFilter === "pending"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/40"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Pending Payouts
            </span>
            <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ₹{stats.pendingAmount}
            </span>
            <span className="text-xs font-bold text-amber-700 font-mono">
              ({stats.pendingCount} req)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {stats.pendingCount > 0 ? "⚠️ Action required by admin" : "All cleared & up-to-date"}
          </span>
        </div>

        {/* Card 2: Completed / Paid */}
        <div
          onClick={() => setStatusFilter("successful")}
          className={`rounded-2xl p-3.5 border transition-all cursor-pointer shadow-xs ${
            statusFilter === "successful"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Settled / Paid UPI
            </span>
            <div className="w-6.5 h-6.5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ₹{stats.paidAmount}
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              ({stats.paidCount} paid)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Transferred with verified UTR
          </span>
        </div>

        {/* Card 3: Rejected / Refunded */}
        <div
          onClick={() => setStatusFilter("rejected")}
          className={`rounded-2xl p-3.5 border transition-all cursor-pointer shadow-xs ${
            statusFilter === "rejected"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/40"
              : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Rejected &amp; Refunded
            </span>
            <div className="w-6.5 h-6.5 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ₹{stats.rejectedAmount}
            </span>
            <span className="text-xs font-bold text-rose-700 font-mono">
              ({stats.rejectedCount} refunded)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Restored to student wallet
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, UPI ID, or UTR/Ref..."
              className="w-full pl-8.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#796AEF] text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              statusFilter === "all"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Requests ({stats.totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Pending ({stats.pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("successful")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              statusFilter === "successful"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Paid / Settled ({stats.paidCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              statusFilter === "rejected"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            Rejected ({stats.rejectedCount})
          </button>
        </div>
      </div>

      {/* Payout Queue List */}
      <div className="space-y-2.5">
        {filteredWithdrawals.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No withdrawal records match your filter.</p>
            <p className="text-[11px] text-slate-400">
              When students request UPI payouts in their Refer &amp; Earn wallet, they appear here for verification.
            </p>
          </div>
        ) : (
          filteredWithdrawals.map((w) => {
            const isPending = w.status === "pending" || w.status === "processing";
            const isPaid = w.status === "successful";
            const isRejected = w.status === "rejected";

            return (
              <div
                key={w.id}
                className={`bg-white rounded-2xl p-3.5 sm:p-4 border shadow-xs transition-all ${
                  isPending
                    ? "border-amber-300 ring-1 ring-amber-400/30 bg-gradient-to-r from-amber-50/20 to-white"
                    : "border-slate-200"
                }`}
              >
                {/* Mobile-Friendly Row Top */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                  {/* Student Info & Ref */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-xs ${
                        isPending
                          ? "bg-amber-100 text-amber-800"
                          : isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isPending ? "⏳" : isPaid ? "₹" : "✕"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                          {w.studentName || "Scholar"}
                        </h4>
                        {w.grade && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9.5px] font-bold font-mono">
                            {w.grade}
                          </span>
                        )}
                        {onInspectStudent && w.studentId && (
                          <button
                            type="button"
                            onClick={() => onInspectStudent(w.studentId!)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Inspect referral tree"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{w.referenceId}</span>
                        <span>•</span>
                        <span>{w.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Status Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[9.5px] uppercase font-mono tracking-wider text-slate-400 block">
                        Payout Amount
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                        ₹{w.amount}
                      </span>
                    </div>

                    <div>
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          Pending Review
                        </span>
                      )}
                      {isPaid && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Paid / Settled
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Refunded
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: UPI handle, UTR details, & Admin Action Buttons */}
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* UPI Handle details */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                        UPI ID:
                      </span>
                      <span className="text-xs font-black font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md truncate select-all">
                        {w.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(w.upiId, `upi_${w.id}`, "UPI ID")}
                        className="text-slate-500 hover:text-slate-800 cursor-pointer p-0.5"
                        title="Copy UPI ID"
                      >
                        {copiedId === `upi_${w.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Paid details */}
                    {isPaid && w.utrNumber && (
                      <div className="text-[10.5px] text-emerald-800 font-mono flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>UTR: <strong>{w.utrNumber}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopy(w.utrNumber!, `utr_${w.id}`, "UTR Number")}
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer ml-1"
                          title="Copy UTR"
                        >
                          {copiedId === `utr_${w.id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {w.processedAt && (
                          <span className="text-slate-400 text-[9.5px]">({w.processedAt})</span>
                        )}
                      </div>
                    )}

                    {/* Rejected details */}
                    {isRejected && (
                      <div className="text-[10.5px] text-rose-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>Reason: <strong>{w.rejectionReason || "Verification issue"}</strong> (Refunded to wallet)</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApproveClick(w)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve &amp; Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectClick(w)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-[10px] font-mono text-slate-400">
                        {isPaid ? "Processed" : "Resolved"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
