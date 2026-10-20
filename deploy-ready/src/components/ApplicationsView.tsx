import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  Calendar,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import { Application, ApplicationStatus, ApplicationType } from '../types';
import { getStatusBadge } from '../utils/statusBadges';

interface ApplicationsViewProps {
  applications: Application[];
  onOpenAddModal: () => void;
  onEditApp: (app: Application) => void;
  onDeleteApp: (id: number) => void;
  onUpdateStatus: (id: number, status: ApplicationStatus) => void;
  onOpenAiHelperForApp?: (app: Application) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onOpenAddModal,
  onEditApp,
  onDeleteApp,
  onUpdateStatus,
  onOpenAiHelperForApp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.companyName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter ? app.status === statusFilter : true;
      const matchesType = typeFilter ? app.type === typeFilter : true;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [applications, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const headers = ['ID,Role,Company,Type,Applied Date,Status,Follow-up Date,Notes'];
    const rows = filteredApps.map(
      (a) =>
        `"${a.id}","${a.role}","${a.companyName}","${a.type}","${a.appliedDate}","${a.status}","${
          a.followUpDate || ''
        }","${(a.notes || '').replace(/"/g, '""')}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careertrack_applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Job Applications</h2>
          <p className="text-sm text-slate-500">
            Track and manage all your job and internship applications ({filteredApps.length} total).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Export filtered applications as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1765D1] hover:bg-[#1352AA] text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Offered">Offered</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="Internship">Internship</option>
            <option value="Job">Job (Full-time)</option>
          </select>

          {(searchTerm || statusFilter || typeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFE] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">Role / Title</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4">Status (Click to Change)</th>
                <th className="py-3 px-4">Follow-up</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No applications found</p>
                    <p className="text-[11px] mt-1">Try modifying your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app, index) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{app.role}</div>
                      {app.salaryOrStipend && (
                        <div className="text-[11px] text-emerald-700 font-medium">
                          {app.salaryOrStipend}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{app.companyName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {app.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{app.appliedDate}</td>
                    <td className="py-3 px-4">
                      <select
                        value={app.status}
                        onChange={(e) =>
                          onUpdateStatus(app.id, e.target.value as ApplicationStatus)
                        }
                        className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-1 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Offered">Offered</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {app.followUpDate ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" /> {app.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenAiHelperForApp && (
                          <button
                            onClick={() => onOpenAiHelperForApp(app)}
                            title="AI Interview Prep & Questions"
                            className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditApp(app)}
                          title="Edit Application"
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete the application for "${app.role}" at "${app.companyName}"?`
                              )
                            ) {
                              onDeleteApp(app.id);
                            }
                          }}
                          title="Delete Application"
                          className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredApps.length)} of {filteredApps.length}{' '}
              applications
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded border flex items-center justify-center font-medium cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-[#2563A6] text-white border-[#2563A6]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
