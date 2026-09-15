import React, { useState, useMemo } from "react";
import {
  X,
  Crown,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Download,
  Percent,
  IndianRupee,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  PlanReferralTier,
  PLAN_REFERRAL_TIERS,
  StudentReferralSummary,
  ReferralAccountState,
  loadReferralState,
  getReferralCommissionConfig,
  getPlanReferralTiers,
  ReferralCommissionConfig,
} from "../utils/referralStore";

export interface CommissionLedgerEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  activityName: string;
  level: number;
  amount: number;
  date: string;
  status: string;
  planName?: string;
  planPriceINR?: number;
  appliedPercent?: number;
  tierLabel?: string;
}

interface AdminTierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentReferralSummary[];
  initialTierDuration?: number | "all";
  onInspectStudent?: (student: StudentReferralSummary) => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export const AdminTierLedgerModal: React.FC<AdminTierLedgerModalProps> = ({
  isOpen,
  onClose,
  students,
  initialTierDuration = "all",
  onInspectStudent,
  onToast,
}) => {
  const [selectedTierDuration, setSelectedTierDuration] = useState<number | "all">(initialTierDuration);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<"all" | "1" | "5">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [commissionConfig, setCommissionConfig] = useState<ReferralCommissionConfig>(() =>
    getReferralCommissionConfig()
  );

  // Sync with live commission config changes
  React.useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e?.detail) {
        setCommissionConfig(e.detail);
      } else {
        setCommissionConfig(getReferralCommissionConfig());
      }
    };
    window.addEventListener("cherry_commission_config_updated", handleConfigUpdate);
    window.addEventListener("cherry_referral_commission_updated", handleConfigUpdate);
    window.addEventListener("cherry_plans_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("cherry_commission_config_updated", handleConfigUpdate);
      window.removeEventListener("cherry_referral_commission_updated", handleConfigUpdate);
      window.removeEventListener("cherry_plans_updated", handleConfigUpdate);
    };
  }, []);

  const activePlanTiers = useMemo(
    () => getPlanReferralTiers(commissionConfig),
    [commissionConfig]
  );

  // Aggregate all commission activities across all students
  const allLedgerEntries: CommissionLedgerEntry[] = useMemo(() => {
    const entries: CommissionLedgerEntry[] = [];

    students.forEach((s) => {
      const acct: ReferralAccountState = loadReferralState(s.studentName, s.studentId);
      const studentTierMonths = acct.planTierMonths || 1;

      (acct.activities || []).forEach((act) => {
        // Derive tier label if missing
        const matchedTier = activePlanTiers.find((t) => t.durationMonths === studentTierMonths);
        const tierLabel = act.tierLabel || (matchedTier ? matchedTier.label : "Monthly Pass");

        entries.push({
          id: act.id,
          studentId: s.studentId,
          studentName: s.studentName,
          studentGrade: s.grade,
          activityName: act.name,
          level: act.level,
          amount: act.amount,
          date: act.date,
          status: act.status,
          planName: act.planName || (act.level === 1 ? "Classroom Direct Invite" : "Team Network Milestone"),
          planPriceINR: act.planPriceINR,
          appliedPercent: act.appliedPercent || (act.level === 1 ? matchedTier?.level1Percent : matchedTier?.level5Percent),
          tierLabel,
        });
      });
    });

    return entries;
  }, [students, activePlanTiers]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allLedgerEntries.filter((entry) => {
      // Tier filter
      if (selectedTierDuration !== "all") {
        const expectedTier = activePlanTiers.find((t) => t.durationMonths === selectedTierDuration);
        if (expectedTier && !entry.tierLabel?.toLowerCase().includes(expectedTier.label.toLowerCase())) {
          return false;
        }
      }

      // Level filter (Direct vs 5th level)
      if (selectedLevelFilter === "1" && entry.level !== 1) return false;
      if (selectedLevelFilter === "5" && entry.level !== 5) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStudent = entry.studentName.toLowerCase().includes(q);
        const matchesActivity = entry.activityName.toLowerCase().includes(q);
        const matchesPlan = entry.planName?.toLowerCase().includes(q);
        const matchesTier = entry.tierLabel?.toLowerCase().includes(q);
        if (!matchesStudent && !matchesActivity && !matchesPlan && !matchesTier) return false;
      }

      return true;
    });
  }, [allLedgerEntries, selectedTierDuration, selectedLevelFilter, searchQuery]);

  // Aggregate stats for filtered entries
  const totalCommissionVolume = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
  }, [filteredEntries]);

  const level1Count = useMemo(() => {
    return filteredEntries.filter((e) => e.level === 1).length;
  }, [filteredEntries]);

  const level5Count = useMemo(() => {
    return filteredEntries.filter((e) => e.level === 5).length;
  }, [filteredEntries]);

  // Aggregate student distribution, multipliers, pending payouts and earnings per tier
  const tierBreakdown = useMemo(() => {
    return activePlanTiers.map((tier) => {
      // Find students whose active tier is this tier
      const tierStudents = students.filter((s) => {
        const acct = loadReferralState(s.studentName, s.studentId);
        const months = acct.planTierMonths || 1;
        return months === tier.durationMonths;
      });

      // Filter ledger entries for this tier
      const tierEntries = allLedgerEntries.filter((e) =>
        e.tierLabel?.toLowerCase().includes(tier.label.toLowerCase())
      );

      const totalEarnings = tierEntries.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
      const pendingPayouts = tierStudents.reduce(
        (sum, s) => sum + (s.pendingWithdrawalsAmount || 0),
        0
      );

      return {
        tier,
        studentCount: tierStudents.length,
        totalEarnings,
        pendingPayouts,
        level1Count: tierEntries.filter((e) => e.level === 1).length,
        level5Count: tierEntries.filter((e) => e.level === 5).length,
      };
    });
  }, [students, allLedgerEntries]);

  // Pending payouts for current selected filter
  const currentPendingPayouts = useMemo(() => {
    if (selectedTierDuration === "all") {
      return students.reduce((sum, s) => sum + (s.pendingWithdrawalsAmount || 0), 0);
    }
    const match = tierBreakdown.find((tb) => tb.tier.durationMonths === selectedTierDuration);
    return match ? match.pendingPayouts : 0;
  }, [selectedTierDuration, students, tierBreakdown]);

  const currentStudentCount = useMemo(() => {
    if (selectedTierDuration === "all") return students.length;
    const match = tierBreakdown.find((tb) => tb.tier.durationMonths === selectedTierDuration);
    return match ? match.studentCount : 0;
  }, [selectedTierDuration, students, tierBreakdown]);

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      onToast?.("No ledger rows to export.", "info");
      return;
    }

    const headers = ["Activity ID", "Scholar Name", "Grade", "Event", "Level", "Tier", "Commission %", "Payout Amount (INR)", "Date", "Status"];
    const rows = filteredEntries.map((e) => [
      e.id,
      `"${e.studentName}"`,
      `"${e.studentGrade || ""}"`,
      `"${e.activityName.replace(/"/g, '""')}"`,
      `L${e.level}`,
      `"${e.tierLabel || ""}"`,
      e.appliedPercent ? `${e.appliedPercent}%` : "Standard",
      e.amount,
      `"${e.date}"`,
      e.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cherry_commission_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast?.("Commission ledger exported successfully to CSV! 📊", "success");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#796AEF] text-white flex items-center justify-center shadow-xs">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Tier-Based Commission Ledger
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[#796AEF] text-[10px] font-black uppercase tracking-wider">
                  Audit Trail
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect how subscription plan multipliers translate into real credited payouts across all tiers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Filter & Metric Strip */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 space-y-3">
          {/* 4 Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Disbursed</div>
              <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5">
                ₹{totalCommissionVolume}
              </div>
              <div className="text-[9px] text-slate-400 font-medium">Filtered volume</div>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Pending Payouts</div>
              <div className="text-sm sm:text-base font-black text-amber-600 mt-0.5">
                ₹{currentPendingPayouts}
              </div>
              <div className="text-[9px] text-slate-400 font-medium">Awaiting approval</div>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Scholars Active</div>
              <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {currentStudentCount} Students
              </div>
              <div className="text-[9px] text-indigo-600 font-medium">In selected tier</div>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Multipliers (L1/L5)</div>
              <div className="text-xs sm:text-sm font-black text-[#796AEF] mt-0.5 truncate">
                {selectedTierDuration === "all"
                  ? `${activePlanTiers[0]?.level1Percent || 22}% - ${activePlanTiers[3]?.level1Percent || 37}% L1`
                  : (() => {
                      const t = activePlanTiers.find((x) => x.durationMonths === selectedTierDuration);
                      return t ? `${t.level1Percent}% L1 • ${t.level5Percent}% L5` : "Standard";
                    })()}
              </div>
              <div className="text-[9px] text-slate-400 font-medium">
                {selectedTierDuration === "all"
                  ? `${activePlanTiers[0]?.totalPercent || 37}% - ${activePlanTiers[3]?.totalPercent || 67}% Max Cap`
                  : (() => {
                      const t = activePlanTiers.find((x) => x.durationMonths === selectedTierDuration);
                      return t ? `${t.totalPercent}% Total Cap` : "Max Cap";
                    })()}
              </div>
            </div>
          </div>

          {/* Tier Distribution & Multiplier Matrix Cards (1M, 3M, 6M, 12M) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#796AEF]" />
                <span>Tier Distribution, Multipliers &amp; Payout Matrix:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTierDuration("all")}
                className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                  selectedTierDuration === "all"
                    ? "bg-slate-900 text-white"
                    : "text-[#796AEF] hover:underline"
                }`}
              >
                Reset / View All ({students.length})
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tierBreakdown.map((tb) => {
                const isSelected = selectedTierDuration === tb.tier.durationMonths;
                return (
                  <button
                    key={tb.tier.tierId}
                    type="button"
                    onClick={() =>
                      setSelectedTierDuration((prev) =>
                        prev === tb.tier.durationMonths ? "all" : tb.tier.durationMonths
                      )
                    }
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-50/80 border-[#796AEF] ring-2 ring-indigo-200 shadow-xs"
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          tb.tier.isMaxVip
                            ? "bg-amber-100 text-amber-800 font-black"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {tb.tier.badge}
                      </span>
                      <span className="text-[10px] font-black text-slate-900 font-mono">
                        {tb.studentCount} {tb.studentCount === 1 ? "Scholar" : "Scholars"}
                      </span>
                    </div>

                    <div className="text-xs font-black text-slate-900 leading-tight">
                      {tb.tier.label}
                    </div>

                    <div className="text-[10px] text-emerald-700 font-mono font-bold mt-1">
                      L1: {tb.tier.level1Percent}% • L5: {tb.tier.level5Percent}%
                    </div>
                    <div className="text-[9px] text-indigo-600 font-semibold">
                      Cap: {tb.tier.totalPercent}% Total
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Earned:</span>
                      <span className="font-bold text-emerald-600">₹{tb.totalEarnings}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Pending:</span>
                      <span className="font-bold text-amber-600">₹{tb.pendingPayouts}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Secondary Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by scholar name or plan..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF]"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value as any)}
                className="text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Levels (L1 &amp; L5)</option>
                <option value="1">Direct (Level 1)</option>
                <option value="5">Team (Level 5)</option>
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                title="Export filtered records to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="p-4 space-y-2 overflow-y-auto no-scrollbar flex-1">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">No commission records matched.</p>
              <p className="text-[11px]">Try selecting "All Tiers" or clearing the search query.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                      entry.level === 1
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    L{entry.level}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {entry.studentName}
                      </span>
                      {entry.tierLabel && (
                        <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                          {entry.tierLabel}
                        </span>
                      )}
                      {entry.appliedPercent && (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-mono font-bold">
                          {entry.appliedPercent}% Comm.
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{entry.activityName}</span>
                      <span>•</span>
                      <span>{entry.date}</span>
                      {entry.planPriceINR && <span>(Plan: ₹{entry.planPriceINR})</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span
                      className={`text-xs sm:text-sm font-black ${
                        entry.amount > 0 ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {entry.amount > 0 ? `+₹${entry.amount}` : "₹0"}
                    </span>
                    <div className="text-[9px] text-slate-400 capitalize">{entry.status}</div>
                  </div>

                  {onInspectStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = students.find((std) => std.studentId === entry.studentId);
                        if (s) {
                          onInspectStudent(s);
                          onClose();
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-[#796AEF] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Inspect student's full network"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <span className="text-[11px] text-slate-500 font-medium">
            Showing {filteredEntries.length} of {allLedgerEntries.length} total commission transactions
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
