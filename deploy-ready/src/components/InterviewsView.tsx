import React, { useState } from 'react';
import { CalendarCheck2, Calendar, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, Video } from 'lucide-react';
import { Interview, Application, InterviewRound, InterviewResult } from '../types';
import { getInterviewResultBadge } from '../utils/statusBadges';

interface InterviewsViewProps {
  interviews: Interview[];
  applications: Application[];
  onSaveInterview: (interviewData: Omit<Interview, 'id'> & { id?: number }) => void;
  onDeleteInterview: (id: number) => void;
  onUpdateResult: (id: number, result: InterviewResult) => void;
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({
  interviews,
  applications,
  onSaveInterview,
  onDeleteInterview,
  onUpdateResult,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number>(applications[0]?.id || 1);
  const [interviewDate, setInterviewDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [round, setRound] = useState<InterviewRound>('Technical');
  const [result, setResult] = useState<InterviewResult>('Pending');
  const [locationOrMeetingLink, setLocationOrMeetingLink] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [filterResult, setFilterResult] = useState<string>('');

  const startEdit = (item: Interview) => {
    setEditingId(item.id);
    setApplicationId(item.applicationId);
    setInterviewDate(item.interviewDate);
    setRound(item.round);
    setResult(item.result);
    setLocationOrMeetingLink(item.locationOrMeetingLink || '');
    setNotes(item.notes || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setApplicationId(applications[0]?.id || 1);
    setInterviewDate(new Date().toISOString().split('T')[0]);
    setRound('Technical');
    setResult('Pending');
    setLocationOrMeetingLink('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const app = applications.find((a) => a.id === applicationId);
    const companyName = app ? app.companyName : 'Company';
    const role = app ? app.role : 'Position';

    onSaveInterview({
      id: editingId || undefined,
      applicationId,
      companyName,
      role,
      interviewDate,
      round,
      result,
      locationOrMeetingLink: locationOrMeetingLink.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    resetForm();
  };

  const filtered = interviews.filter((i) => {
    if (!filterResult) return true;
    return i.result === filterResult;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Interviews</h2>
        <p className="text-sm text-slate-500">Schedule and record all assessment rounds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Add / Edit Interview (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142D4E]">
              {editingId ? 'Edit Interview' : 'Add New Interview'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                + Reset
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Application *</label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.role} — {app.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interview Date *</label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Round *</label>
                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value as InterviewRound)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aptitude">Aptitude</option>
                  <option value="Technical">Technical</option>
                  <option value="Coding Assessment">Coding Assessment</option>
                  <option value="HR">HR</option>
                  <option value="Managerial">Managerial</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Result *</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as InterviewResult)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Meeting Link / Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Google Meet or Room 302"
                value={locationOrMeetingLink}
                onChange={(e) => setLocationOrMeetingLink(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes &amp; Topics</label>
              <textarea
                rows={2}
                placeholder="Topics covered, questions asked, feedback..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-[#1765D1] hover:bg-[#1352AA] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {editingId ? 'Update Interview' : 'Save Interview'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Table: Interviews List (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#142D4E]">All Scheduled Interviews</h3>
            <div className="flex items-center gap-2">
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="">All Results</option>
                <option value="Pending">Pending</option>
                <option value="Cleared">Cleared</option>
                <option value="Rejected">Rejected</option>
              </select>
              <span className="text-xs text-slate-500 font-medium">({filtered.length})</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFCFE] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-10">#</th>
                  <th className="py-2.5 px-4">Role / Company</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Round</th>
                  <th className="py-2.5 px-4">Result</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.role}</div>
                      <div className="text-[11px] text-slate-500">{item.companyName}</div>
                      {item.locationOrMeetingLink && (
                        <div className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-1">
                          <Video className="w-3 h-3" /> {item.locationOrMeetingLink}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {item.interviewDate}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.round}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.result}
                        onChange={(e) =>
                          onUpdateResult(item.id, e.target.value as InterviewResult)
                        }
                        className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-0.5 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Cleared">Cleared</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(item)}
                          title="Edit Interview"
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this interview record?')) {
                              onDeleteInterview(item.id);
                            }
                          }}
                          title="Delete Interview"
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
