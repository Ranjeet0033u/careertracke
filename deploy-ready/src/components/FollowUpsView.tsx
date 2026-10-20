import React, { useState } from 'react';
import { Clock, AlertTriangle, Calendar, CheckCircle2, Mail, Plus, Trash2 } from 'lucide-react';
import { Application, Company } from '../types';

interface FollowUpsViewProps {
  applications: Application[];
  companies: Company[];
  onSetFollowUp: (appId: number, date: string | null) => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  applications,
  companies,
  onSetFollowUp,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<number>(applications[0]?.id || 1);
  const [followUpDate, setFollowUpDate] = useState<string>(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;
    onSetFollowUp(selectedAppId, followUpDate);
  };

  // Overdue: followUpDate <= todayStr
  const overdueApps = applications.filter(
    (a) =>
      a.followUpDate &&
      a.followUpDate <= todayStr &&
      a.status !== 'Rejected' &&
      a.status !== 'Offered'
  );

  // Upcoming: followUpDate > todayStr
  const upcomingApps = applications.filter(
    (a) =>
      a.followUpDate &&
      a.followUpDate > todayStr &&
      a.status !== 'Rejected' &&
      a.status !== 'Offered'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Follow-ups</h2>
        <p className="text-sm text-slate-500">
          Stay proactive with timely recruiter follow-ups and avoid ghosting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Add Follow-up (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="pb-3.5 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142D4E]">Schedule Follow-up</h3>
            <p className="text-xs text-slate-500">Attach a reminder date to any active application.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application *</label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                {applications
                  .filter((a) => a.status !== 'Rejected')
                  .map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.role} — {app.companyName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Follow-up Date *</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-3 bg-[#1765D1] hover:bg-[#1352AA] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Follow-up Date</span>
              </button>
            </div>
          </form>

          {/* Quick email tips */}
          <div className="mt-5 p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-semibold text-blue-900 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" /> Professional Tip
            </div>
            <p>
              Best practice is to follow up 5–7 days after submitting an application, or within 24 hours of completing an interview round.
            </p>
          </div>
        </div>

        {/* Right Two Panels (8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Overdue Follow-ups Panel */}
          <div className="bg-white rounded-xl border border-rose-200/90 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Overdue Follow-ups</h3>
                  <p className="text-[11px] text-rose-700">Past target date</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800">
                {overdueApps.length} overdue
              </span>
            </div>

            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-96">
              {overdueApps.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-semibold text-slate-700">No overdue follow-ups!</p>
                  <p className="text-[11px]">All applications are on track.</p>
                </div>
              ) : (
                overdueApps.map((app) => {
                  const company = companies.find((c) => c.id === app.companyId);
                  const email = company?.contactEmail || 'hr@company.com';
                  return (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{app.role}</div>
                        <div className="text-[11px] text-slate-500 truncate">{app.companyName}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          Due: {app.followUpDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`mailto:${email}?subject=Follow-up: Application for ${encodeURIComponent(
                            app.role
                          )}&body=Dear ${encodeURIComponent(
                            app.companyName
                          )} Team,%0D%0A%0D%0AI hope you are well. I am following up on my application for the ${encodeURIComponent(
                            app.role
                          )} role. I look forward to any updates regarding my candidacy.%0D%0A%0D%0AThank you,%0D%0ARanjeet P I`}
                          title="Open Email Draft"
                          className="p-1.5 rounded bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onSetFollowUp(app.id, null)}
                          title="Mark Done / Dismiss"
                          className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Follow-ups Panel */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-[#142D4E]">Upcoming Follow-ups</h3>
                  <p className="text-[11px] text-slate-500">Scheduled reminders</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {upcomingApps.length} active
              </span>
            </div>

            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-96">
              {upcomingApps.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No scheduled upcoming follow-ups</p>
                  <p className="text-[11px]">Use the left form to schedule one.</p>
                </div>
              ) : (
                upcomingApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{app.role}</div>
                      <div className="text-[11px] text-slate-500 truncate">{app.companyName}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Follow-up: {app.followUpDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onSetFollowUp(app.id, null)}
                        title="Remove Reminder"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
