import React, { useState, useEffect } from 'react';
import { X, Building2, Briefcase, Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import { Application, Company, ApplicationStatus, ApplicationType } from '../types';

interface AddEditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appData: Omit<Application, 'id'> & { id?: number }) => void;
  initialApp?: Application | null;
  companies: Company[];
  onAddNewCompany?: (company: Omit<Company, 'id'>) => number;
}

export const AddEditApplicationModal: React.FC<AddEditApplicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialApp,
  companies,
}) => {
  const [companyId, setCompanyId] = useState<number>(1);
  const [companyName, setCompanyName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [type, setType] = useState<ApplicationType>('Job');
  const [appliedDate, setAppliedDate] = useState<string>('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [salaryOrStipend, setSalaryOrStipend] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialApp) {
      setCompanyId(initialApp.companyId);
      setCompanyName(initialApp.companyName);
      setRole(initialApp.role);
      setType(initialApp.type);
      setAppliedDate(initialApp.appliedDate);
      setStatus(initialApp.status);
      setFollowUpDate(initialApp.followUpDate || '');
      setSalaryOrStipend(initialApp.salaryOrStipend || '');
      setNotes(initialApp.notes || '');
    } else {
      const defaultCompany = companies[0];
      setCompanyId(defaultCompany ? defaultCompany.id : 1);
      setCompanyName(defaultCompany ? defaultCompany.name : '');
      setRole('');
      setType('Internship');
      setAppliedDate(new Date().toISOString().split('T')[0]);
      setStatus('Applied');
      setFollowUpDate('');
      setSalaryOrStipend('');
      setNotes('');
    }
  }, [initialApp, isOpen, companies]);

  if (!isOpen) return null;

  const handleCompanyChange = (cId: number) => {
    setCompanyId(cId);
    const matched = companies.find((c) => c.id === cId);
    if (matched) {
      setCompanyName(matched.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;

    const matched = companies.find((c) => c.id === companyId);
    const finalCompanyName = matched ? matched.name : companyName || 'Company';

    onSave({
      id: initialApp?.id,
      companyId,
      companyName: finalCompanyName,
      role: role.trim(),
      type,
      appliedDate: appliedDate || new Date().toISOString().split('T')[0],
      status,
      followUpDate: followUpDate.trim() ? followUpDate : null,
      salaryOrStipend: salaryOrStipend.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden transform transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-lg font-bold text-[#142D4E]">
              {initialApp ? 'Edit Application' : 'Add New Application'}
            </h3>
            <p className="text-xs text-slate-500">Record and track your application milestones.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Company <span className="text-rose-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => handleCompanyChange(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location})
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Role / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Software Developer Intern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Type & Applied Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Application Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ApplicationType)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Internship">Internship</option>
                <option value="Job">Job (Full-time)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Applied Date
              </label>
              <input
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status & Follow-up Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Follow-up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Package / Stipend */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Package / Stipend Info (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ₹12.00 LPA or ₹30,000 / mo"
              value={salaryOrStipend}
              onChange={(e) => setSalaryOrStipend(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Notes &amp; Highlights (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Referral name, job link, interview rounds outline..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-[#1765D1] hover:bg-[#1352AA] text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              {initialApp ? 'Update Application' : 'Save Application'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
