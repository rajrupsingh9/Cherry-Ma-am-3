import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  Award,
  Calendar,
  CreditCard,
  Copy,
  Check,
  Sparkles,
  QrCode,
  Share2,
} from "lucide-react";
import { StudentSubscriptionRecord } from "../utils/subscriptionStore";

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: StudentSubscriptionRecord | null;
  onToast?: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onToast,
}) => {
  const [copied, setCopied] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !subscription) return null;

  const receiptNo = `CHERRY-REC-2026-${(subscription.utrNumber || subscription.id || "000000").slice(-6).toUpperCase()}`;
  const issueDate = subscription.activatedAt
    ? new Date(subscription.activatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const validUntilDate = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Active (6 Months)";

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `🧾 CHERRY AI CLASSROOM FEE RECEIPT\nReceipt No: ${receiptNo}\nStudent: ${subscription.studentName} (${subscription.grade || "Class 10"})\nPlan: ${subscription.planName}\nAmount Paid: ₹${subscription.amountINR}\nUTR/Ref: ${subscription.utrNumber || "Verified"}\nValid Until: ${validUntilDate}\nVerified by Cherry AI Academy.`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    if (onToast) onToast("Receipt summary copied to clipboard! 📋", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Print-specific stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-fee-receipt, #printable-fee-receipt * {
            visibility: visible;
          }
          #printable-fee-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-[#796AEF] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Digital Fee Receipt</h3>
              <p className="text-[10px] text-slate-500 font-medium">Official Payment Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Card Body */}
        <div id="printable-fee-receipt" ref={receiptRef} className="p-5 sm:p-6 space-y-4 text-xs bg-white">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#796AEF] font-black text-[11px] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CHERRY AI ACADEMY</span>
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              TUITION & COURSE FEE RECEIPT
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Academic Year 2026-27 • Zero-Fee Direct UPI Clearing
            </p>
          </div>

          {/* Verification Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-[11px] leading-tight">
                  PAYMENT VERIFIED & PRO ACTIVE
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Authorised by Chief Administrator
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                Status
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                PAID
              </span>
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px]">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Receipt No</p>
              <p className="font-mono font-black text-slate-900">{receiptNo}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Date of Issue</p>
              <p className="font-bold text-slate-800">{issueDate}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Payment Mode</p>
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-[#796AEF]" />
                <span>UPI Direct</span>
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">UTR / Reference No</p>
              <p className="font-mono font-bold text-slate-900 truncate">
                {subscription.utrNumber || "Verified Online"}
              </p>
            </div>
          </div>

          {/* Student Profile Section */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Student Information
            </p>
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 text-sm">{subscription.studentName}</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[10px]">
                {subscription.grade || "Class 10"} • {subscription.board || "CBSE"}
              </span>
            </div>
            {subscription.studentEmail && (
              <p className="text-[10px] text-slate-500 font-medium">{subscription.studentEmail}</p>
            )}
          </div>

          {/* Fee Itemization Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Description / Plan</span>
              <span>Amount (INR)</span>
            </div>
            <div className="p-3 space-y-2 text-[11px]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{subscription.planName}</p>
                  <p className="text-[10px] text-slate-500">
                    Unlimited 1-on-1 Cherry AI Live Classroom & PYQ Vault
                  </p>
                  <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                    Validity: {issueDate} to {validUntilDate}
                  </p>
                </div>
                <span className="font-black text-slate-900">₹{subscription.amountINR}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-xs font-black">
                <span className="text-slate-800">Total Net Amount Paid</span>
                <span className="text-sm font-black text-[#796AEF]">₹{subscription.amountINR}</span>
              </div>
            </div>
          </div>

          {/* Institutional Signature & Seal */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Verification Authority</p>
              <p className="text-[10px] font-bold text-slate-800">
                {subscription.approvedBy || "Admin (onlinework0876@gmail.com)"}
              </p>
              <p className="text-[9px] text-slate-400">Digitally Generated & Verified by Cherry AI</p>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-200 bg-indigo-50/50 flex flex-col items-center justify-center text-center p-1">
              <ShieldCheck className="w-4 h-4 text-[#796AEF]" />
              <span className="text-[7.5px] font-black text-[#796AEF] leading-tight uppercase">
                CERTIFIED
              </span>
            </div>
          </div>

          {/* Terms Note */}
          <p className="text-[9px] text-slate-400 text-center leading-relaxed">
            * This is a computer-generated educational fee receipt and does not require a physical signature.
            Valid for the subscription duration across all registered Cherry AI learning modules.
          </p>
        </div>

        {/* Footer Actions (Hidden in Print) */}
        <div className="no-print p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 h-10 bg-[#796AEF] hover:bg-[#6858e0] active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={handleCopySummary}
            className="h-10 px-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
