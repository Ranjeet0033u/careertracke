import React from 'react';
import {
  Send,
  CalendarCheck2,
  Award,
  XCircle,
  Plus,
  ArrowRight,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Application, Interview, Offer, NavTab, Company } from '../types';
import { getStatusBadge } from '../utils/statusBadges';

interface DashboardViewProps {
  applications: Application[];
  interviews: Interview[];
  offers: Offer[];
  companies: Company[];
  onNavigate: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onEditApp: (app: Application) => void;
  onMarkFollowUpDone: (appId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  interviews,
  offers,
  companies,
  onNavigate,
  onOpenAddModal,
  onEditApp,
  onMarkFollowUpDone,
}) => {
  const totalApps = applications.length;
  const interviewsCount = interviews.filter((i) => i.result === 'Pending').length || interviews.length;
  const offersCount = offers.length;
  const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;

  const todayStr = new Date().toISOString().split('T')[0];

  // Overdue follow-ups: followUpDate <= todayStr
  const overdueFollowUps = applications.filter(
    (a) => a.followUpDate && a.followUpDate <= todayStr && a.status !== 'Rejected' && a.status !== 'Offered'
  );

  // Upcoming interviews
  const upcomingInterviews = interviews
    .filter((i) => i.result === 'Pending' || i.interviewDate >= '2026-10-01')
    .slice(0, 4);

  // Recent 5 applications
  const recentApps = [...applications]
    .sort((a, b) => (b.appliedDate > a.appliedDate ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500">Your application activity at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('syllabus_lab')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>DBMS &amp; Java Lab</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1765D1] hover:bg-[#1352AA] text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* 4 Highlight Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Applications Sent */}
        <div
          onClick={() => onNavigate('applications')}
          className="p-5 rounded-xl bg-[#F0F6FD] border border-[#D4E5FA] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Total Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-[#2563A6]/15 text-[#2563A6] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#142D4E]">{totalApps}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Applications sent</div>
            <div className="text-[11px] text-slate-500">Across {companies.length} target companies</div>
          </div>
        </div>

        {/* Stat 2: Interviews */}
        <div
          onClick={() => onNavigate('interviews')}
          className="p-5 rounded-xl bg-[#F0FAF4] border border-[#D2F2DF] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Interview Stage</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/15 text-[#16A34A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#142D4E]">{interviewsCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Interviews active</div>
            <div className="text-[11px] text-slate-500">
              {interviews.length} rounds recorded overall
            </div>
          </div>
        </div>

        {/* Stat 3: Offers */}
        <div
          onClick={() => onNavigate('offers')}
          className="p-5 rounded-xl bg-[#FFFBF0] border border-[#FCEEC7] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Placement Success</span>
            <div className="w-8 h-8 rounded-lg bg-[#D97706]/15 text-[#D97706] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#142D4E]">{offersCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Offers received</div>
            <div className="text-[11px] text-slate-500">1 accepted &bull; 1 pending decision</div>
          </div>
        </div>

        {/* Stat 4: Rejections */}
        <div
          onClick={() => onNavigate('applications')}
          className="p-5 rounded-xl bg-[#FFF2F4] border border-[#FCDCE2] flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Rejections</span>
            <div className="w-8 h-8 rounded-lg bg-[#E11D48]/15 text-[#E11D48] flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#142D4E]">{rejectedCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Rejections</div>
            <div className="text-[11px] text-slate-500">Normal funnel attrition</div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Upcoming Interviews & Overdue Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upcoming interviews panel (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Upcoming interviews</h3>
              <p className="text-xs text-slate-500">Active rounds and evaluations</p>
            </div>
            <button
              onClick={() => onNavigate('interviews')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Role / Company</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Round</th>
                  <th className="py-2.5 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{interview.role}</div>
                      <div className="text-[11px] text-slate-500">{interview.companyName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <span className="font-medium">{interview.interviewDate}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {interview.round}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {interview.result === 'Cleared' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {interview.result}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue follow-ups panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Action items &amp; Follow-ups</h3>
                <p className="text-xs text-slate-500">Applications needing a response</p>
              </div>
            </div>
            {overdueFollowUps.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                {overdueFollowUps.length} overdue
              </span>
            )}
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
            {overdueFollowUps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700">All follow-ups up to date!</p>
                <p className="text-[11px]">No overdue reminders right now.</p>
              </div>
            ) : (
              overdueFollowUps.map((app) => (
                <div
                  key={app.id}
                  className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{app.role}</div>
                    <div className="text-slate-500 text-[11px] truncate">{app.companyName}</div>
                    <div className="text-rose-600 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due {app.followUpDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onMarkFollowUpDone(app.id)}
                      title="Mark as Followed Up"
                      className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                    <a
                      href={`mailto:${
                        companies.find((c) => c.id === app.companyId)?.contactEmail || 'hr@company.com'
                      }?subject=Following up on my application for ${encodeURIComponent(
                        app.role
                      )}&body=Dear Hiring Team,%0D%0A%0D%0AI am writing to politely follow up on my application for the ${encodeURIComponent(
                        app.role
                      )} position at ${encodeURIComponent(
                        app.companyName
                      )} submitted on ${app.appliedDate}.%0D%0A%0D%0ABest regards,%0D%0ARanjeet P I`}
                      title="Send email"
                      className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded text-[11px] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications Panel */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent applications</h3>
            <p className="text-xs text-slate-500">Keep track of every opportunity</p>
          </div>
          <button
            onClick={() => onNavigate('applications')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            View all applications <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Position</th>
                <th className="py-2.5 px-4">Company</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Applied On</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{app.role}</td>
                  <td className="py-3 px-4 text-slate-700">{app.companyName}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {app.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{app.appliedDate}</td>
                  <td className="py-3 px-4">{getStatusBadge(app.status)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onEditApp(app)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
