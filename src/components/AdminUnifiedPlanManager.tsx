import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  IndianRupee,
  Calendar,
  Tag,
  Star,
  Check,
  X,
  AlertCircle,
  Eye,
  RotateCcw,
  Save,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { SubscriptionPlan } from "../utils/subscriptionStore";

interface AdminUnifiedPlanManagerProps {
  plans: SubscriptionPlan[];
  onPlansChange: (newPlans: SubscriptionPlan[]) => void;
  onSaveAllPlans: (newPlans?: SubscriptionPlan[]) => Promise<void>;
  onResetPlans: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  onToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

interface PlanFormData {
  id?: string;
  name: string;
  tagline: string;
  durationMonths: number;
  durationLabel: string;
  priceINR: number;
  originalPriceINR: number;
  popular: boolean;
  features: string[];
}

const DEFAULT_FEATURE_PRESETS = [
  "Unlimited 1-on-1 Cherry Ma'am Live Socratic Teaching",
  "Full Virtual Lab Simulation Sandbox (Class 6-12)",
  "10-Year PYQ Predicted Papers & Step-wise Marking",
  "Interactive 24/7 Kiara & Socratic Voice Whiteboard",
  "Chapter Smart Handbooks, Infographics & PDF Exports",
  "Instant Referral Earning Program (Earn ₹50 per friend)",
];

export const AdminUnifiedPlanManager: React.FC<AdminUnifiedPlanManagerProps> = ({
  plans,
  onPlansChange,
  onSaveAllPlans,
  onResetPlans,
  isSaving,
  hasChanges,
  onToast,
}) => {
  // Modal state for Add/Edit Unified Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Plan Delete confirmation state
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  // Unified Form state
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    tagline: "",
    durationMonths: 1,
    durationLabel: "1 Month",
    priceINR: 149,
    originalPriceINR: 499,
    popular: false,
    features: [...DEFAULT_FEATURE_PRESETS],
  });

  const [featureInput, setFeatureInput] = useState("");

  // Helper to open the unified form in "Add" mode
  const handleOpenAddForm = () => {
    setEditingPlanId(null);
    setFormData({
      name: "",
      tagline: "",
      durationMonths: 6,
      durationLabel: "6 Months",
      priceINR: 149,
      originalPriceINR: 999,
      popular: false,
      features: [...DEFAULT_FEATURE_PRESETS],
    });
    setFeatureInput("");
    setIsFormOpen(true);
  };

  // Helper to open the unified form in "Edit" mode
  const handleOpenEditForm = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setFormData({
      id: plan.id,
      name: plan.name,
      tagline: plan.tagline || "",
      durationMonths: plan.durationMonths || 1,
      durationLabel: plan.durationLabel || `${plan.durationMonths || 1} Months`,
      priceINR: plan.priceINR,
      originalPriceINR: plan.originalPriceINR || plan.priceINR * 2,
      popular: !!plan.popular,
      features: Array.isArray(plan.features) && plan.features.length > 0 
        ? [...plan.features] 
        : [...DEFAULT_FEATURE_PRESETS],
    });
    setFeatureInput("");
    setIsFormOpen(true);
  };

  // Duration quick selector presets
  const handleSelectDurationPreset = (months: number) => {
    const label =
      months === 1
        ? "1 Month"
        : months === 12
        ? "1 Full Year (12 Months)"
        : `${months} Months`;

    setFormData((prev) => ({
      ...prev,
      durationMonths: months,
      durationLabel: label,
    }));
  };

  // Compute live discount percentage
  const discountPercent =
    formData.originalPriceINR > formData.priceINR && formData.originalPriceINR > 0
      ? Math.round(
          ((formData.originalPriceINR - formData.priceINR) /
            formData.originalPriceINR) *
            100
        )
      : 0;

  // Add feature bullet point
  const handleAddFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    if (formData.features.includes(trimmed)) {
      onToast?.("This feature is already in the list", "info");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, trimmed],
    }));
    setFeatureInput("");
  };

  // Remove feature
  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Save the Unified Form (Add or Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onToast?.("Please enter a Plan Name (e.g. 6 Months Special Pass)", "error");
      return;
    }

    if (formData.priceINR < 0) {
      onToast?.("Price cannot be negative", "error");
      return;
    }

    if (formData.durationMonths <= 0) {
      onToast?.("Duration in months must be at least 1", "error");
      return;
    }

    const calculatedDiscount =
      formData.originalPriceINR > formData.priceINR && formData.originalPriceINR > 0
        ? Math.round(
            ((formData.originalPriceINR - formData.priceINR) /
              formData.originalPriceINR) *
              100
          )
        : 0;

    let updatedPlans: SubscriptionPlan[];

    if (editingPlanId) {
      // EDIT existing plan
      updatedPlans = plans.map((p) => {
        if (p.id !== editingPlanId) {
          // If this edited plan is marked popular, unmark others if desired
          return formData.popular ? { ...p, popular: false } : p;
        }
        return {
          ...p,
          name: formData.name.trim(),
          tagline: formData.tagline.trim(),
          durationMonths: formData.durationMonths,
          durationLabel: formData.durationLabel.trim() || `${formData.durationMonths} Months`,
          priceINR: formData.priceINR,
          originalPriceINR: formData.originalPriceINR,
          discountPercent: calculatedDiscount,
          popular: formData.popular,
          features: formData.features.length > 0 ? formData.features : DEFAULT_FEATURE_PRESETS,
        };
      });
      onToast?.(`Plan "${formData.name.trim()}" updated successfully! ✨`, "success");
    } else {
      // ADD new plan
      const newPlanId =
        "plan_" +
        formData.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) +
        "_" +
        Date.now().toString().slice(-4);

      const newPlan: SubscriptionPlan = {
        id: newPlanId,
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        durationMonths: formData.durationMonths,
        durationLabel: formData.durationLabel.trim() || `${formData.durationMonths} Months`,
        priceINR: formData.priceINR,
        originalPriceINR: formData.originalPriceINR,
        discountPercent: calculatedDiscount,
        popular: formData.popular,
        features: formData.features.length > 0 ? formData.features : DEFAULT_FEATURE_PRESETS,
      };

      updatedPlans = formData.popular
        ? [...plans.map((p) => ({ ...p, popular: false })), newPlan]
        : [...plans, newPlan];

      onToast?.(`New plan "${newPlan.name}" added to list! 🎉`, "success");
    }

    onPlansChange(updatedPlans);
    setIsFormOpen(false);

    // Auto-save to cloud & local storage
    await onSaveAllPlans(updatedPlans);
  };

  // Confirm and delete plan
  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;

    if (plans.length <= 1) {
      onToast?.("At least one subscription plan must remain active for student onboarding.", "error");
      setPlanToDelete(null);
      return;
    }

    const updatedPlans = plans.filter((p) => p.id !== planToDelete.id);
    onPlansChange(updatedPlans);
    onToast?.(`Plan "${planToDelete.name}" deleted.`, "info");
    setPlanToDelete(null);

    // Auto-save to cloud & local storage
    await onSaveAllPlans(updatedPlans);
  };

  // Toggle popular status
  const handleTogglePopular = async (planId: string) => {
    const updatedPlans = plans.map((p) => ({
      ...p,
      popular: p.id === planId ? !p.popular : false,
    }));
    onPlansChange(updatedPlans);
    await onSaveAllPlans(updatedPlans);
    onToast?.("Featured popular plan updated! ★", "info");
  };

  // Duplicate plan shortcut
  const handleDuplicatePlan = async (plan: SubscriptionPlan) => {
    const copyId = `plan_copy_${Date.now().toString().slice(-5)}`;
    const copiedPlan: SubscriptionPlan = {
      ...plan,
      id: copyId,
      name: `${plan.name} (Copy)`,
      popular: false,
    };
    const updatedPlans = [...plans, copiedPlan];
    onPlansChange(updatedPlans);
    await onSaveAllPlans(updatedPlans);
    onToast?.(`Duplicated "${plan.name}" as new plan! 📋`, "success");
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Pricing & Subscription Plans
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-[#796AEF] border border-indigo-100">
              {plans.length} {plans.length === 1 ? "Plan" : "Plans"} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Set and customize the plans students see during registration and onboarding checkout.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onResetPlans}
            className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset plans back to factory default amounts"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddForm}
            id="admin-add-new-plan-btn"
            className="h-9 px-4 rounded-xl bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid / List */}
      <div className="space-y-3.5">
        {plans.map((plan, index) => {
          const isLaunchDefault = plan.id === "semiannual_149";
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3.5 ${
                plan.popular
                  ? "border-[#796AEF] ring-2 ring-[#796AEF]/15"
                  : isLaunchDefault
                  ? "border-indigo-200"
                  : "border-slate-200"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-[#796AEF] font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                        {plan.name}
                      </h4>
                      {plan.popular && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Popular Choice</span>
                        </span>
                      )}
                      {isLaunchDefault && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-[#796AEF] text-[10px] font-bold rounded-full">
                          Default Special Offer
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {plan.id}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(plan.id)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      plan.popular
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                    }`}
                    title="Toggle featured popular badge for students"
                  >
                    <Star className={`w-3 h-3 ${plan.popular ? "fill-amber-500 text-amber-500" : ""}`} />
                    <span>{plan.popular ? "Featured" : "Set Popular"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicatePlan(plan)}
                    className="h-7 px-2 rounded-lg text-[11px] font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer flex items-center gap-1"
                    title="Duplicate this plan"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditForm(plan)}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-[#796AEF]/10 hover:bg-[#796AEF]/20 text-[#796AEF] transition-all cursor-pointer flex items-center gap-1"
                    title="Edit plan name, description, validity, pricing"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanToDelete(plan)}
                    disabled={plans.length <= 1}
                    className={`h-7 w-7 rounded-lg text-[11px] font-bold border flex items-center justify-center transition-all ${
                      plans.length <= 1
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    }`}
                    title={plans.length <= 1 ? "At least one plan required" : "Delete plan"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tagline / Description Display */}
              {plan.tagline && (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{plan.tagline}</span>
                </div>
              )}

              {/* Key Metrics / Snapshot Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                    Offer Price
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-900">₹{plan.priceINR}</span>
                    {plan.originalPriceINR > plan.priceINR && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ₹{plan.originalPriceINR}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                    Validity Duration
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {plan.durationMonths} {plan.durationMonths === 1 ? "Month" : "Months"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({plan.durationLabel})
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                    Student Discount
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 block">
                    {plan.discountPercent}% OFF
                  </span>
                  <span className="text-[10px] text-emerald-700/80 font-medium">
                    Save ₹{Math.max(0, (plan.originalPriceINR || 0) - plan.priceINR)}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                    Monthly Equiv.
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    ₹{Math.round(plan.priceINR / (plan.durationMonths || 1))}/mo
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Effective cost
                  </span>
                </div>
              </div>

              {/* Feature Chips */}
              {plan.features && plan.features.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Student Features ({plan.features.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.slice(0, 3).map((feat, fi) => (
                      <span
                        key={fi}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium truncate max-w-xs"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                    {plan.features.length > 3 && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-[#796AEF] rounded-md text-[10px] font-bold">
                        +{plan.features.length - 3} more perks
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Save Action Bar */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 sticky bottom-3 z-10">
        <div className="text-xs">
          <span className="font-bold text-slate-800">{plans.length} Tiers Configured</span>
          <p className="text-[10px] text-slate-400">
            {hasChanges ? "Changes pending save" : "All plans synced with Cloud Firestore"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetPlans}
            className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => onSaveAllPlans()}
            disabled={isSaving}
            className="h-10 px-5 rounded-xl bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Pricing & Validity"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED PLAN FORM MODAL (Add / Edit Plan)                                 */}
      {/* Contains: Plan Name, Description, Duration (Months), Pricing, Features    */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#796AEF] flex items-center justify-center text-white shadow-md">
                  {editingPlanId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingPlanId ? "Edit Subscription Plan" : "Create New Subscription Plan"}
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    Set Plan Name, Description, Duration in Months & Pricing
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 1. Plan Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Plan Name (योजना का नाम) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. 6 Months Special Pass, Monthly Pro</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 6 Months Special Pass"
                  className="w-full text-sm font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-900 transition-all"
                />
              </div>

              {/* 2. Description / Tagline */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Description / Tagline (विवरण / ऑफर संदेश)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Displayed directly under the plan name</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. Complete Syllabus Coverage + 1-on-1 AI Doubt Solver for Class 6-12"
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-800 transition-all resize-none"
                />
              </div>

              {/* 3. Duration & Validity (Months) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#796AEF]" />
                    <span>Duration & Validity (अवधि) *</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#796AEF]">
                    {formData.durationMonths} {formData.durationMonths === 1 ? "Month" : "Months"} Access
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectDurationPreset(m)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formData.durationMonths === m
                          ? "bg-[#796AEF] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m === 1 ? "1 Month" : m === 12 ? "1 Year (12 Mo)" : `${m} Mo`}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Months Count (संख्या)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={formData.durationMonths}
                      onChange={(e) => {
                        const m = Math.max(1, parseInt(e.target.value) || 1);
                        setFormData((prev) => ({
                          ...prev,
                          durationMonths: m,
                          durationLabel: m === 1 ? "1 Month" : `${m} Months`,
                        }));
                      }}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Custom Duration Label
                    </label>
                    <input
                      type="text"
                      value={formData.durationLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, durationLabel: e.target.value }))
                      }
                      placeholder="e.g. 6 Months"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Pricing (Amount in ₹) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-[#796AEF]" />
                    <span>Pricing & Amount (मूल्य) *</span>
                  </span>
                  {discountPercent > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                      {discountPercent}% DISCOUNT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Student Offer Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formData.priceINR}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            priceINR: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full text-sm font-black pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Original MRP (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={formData.originalPriceINR}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            originalPriceINR: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full text-sm pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] text-slate-500 line-through"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Popular Badge Toggle */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Mark as Most Popular / Recommended
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Highlights this plan with a golden badge for students during onboarding
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, popular: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-[#796AEF] focus:ring-[#796AEF] cursor-pointer"
                />
              </div>

              {/* 6. Included Student Features List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Student Perks & Features ({formData.features.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Shown as checkmarks</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Type a feature and press Enter or Add"
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {formData.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-200/60"
                    >
                      <span>✓ {feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Student Card Preview */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1 text-[#796AEF] text-xs font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Student Registration Preview</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-indigo-100/80 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">
                        {formData.name || "Untitled Plan"}
                      </span>
                      {formData.popular && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                      {formData.tagline || `${formData.durationMonths} Months access`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-[#796AEF]">₹{formData.priceINR}</span>
                    <span className="text-[10px] text-slate-400 block">
                      for {formData.durationLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPlanId ? "Update Plan" : "Create Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Delete "{planToDelete.name}"?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Students will no longer see this plan during onboarding and registration. This action can be reversed by adding it again or resetting defaults.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Yes, Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
