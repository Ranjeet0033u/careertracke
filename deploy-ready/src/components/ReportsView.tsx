import React from 'react';
import { Award, Download, TrendingUp, BarChart2, PieChart, FileSpreadsheet } from 'lucide-react';
import { Application, Interview, Offer, Company } from '../types';

interface ReportsViewProps {
  applications: Application[];
  interviews: Interview[];
  offers: Offer[];
  companies: Company[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  applications,
  interviews,
  offers,
  companies,
}) => {
  const totalApps = applications.length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const shortlistedCount = applications.filter((a) => a.status === 'Shortlisted').length;
  const interviewCount = applications.filter((a) => a.status === 'Interview Scheduled').length;
  const offeredCount = applications.filter((a) => a.status === 'Offered').length;
  const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;

  const offerRate = totalApps > 0 ? ((offeredCount / totalApps) * 100).toFixed(1) : '0';
  const interviewRate = totalApps > 0 ? (((interviewCount + offeredCount) / totalApps) * 100).toFixed(1) : '0';

  const highestOffer = offers.reduce<Offer | null>((max, curr) => {
    if (!max || curr.packageLpa > max.packageLpa) return curr;
    return max;
  }, null);

  // Group applications by company
  const companyCounts: { [name: string]: number } = {};
  applications.forEach((a) => {
    companyCounts[a.companyName] = (companyCounts[a.companyName] || 0) + 1;
  });

  const sortedCompanyList = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCompanyCount = sortedCompanyList[0]?.[1] || 1;

  const handleDownloadFullReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      studentName: 'Ranjeet P I',
      summary: {
        totalApplications: totalApps,
        interviewsRecorded: interviews.length,
        offersReceived: offers.length,
        rejectionsCount: rejectedCount,
        offerConversionRate: `${offerRate}%`,
        interviewConversionRate: `${interviewRate}%`,
        highestPackageLpa: highestOffer ? highestOffer.packageLpa : 0,
      },
      statusBreakdown: {
        Applied: appliedCount,
        Shortlisted: shortlistedCount,
        InterviewScheduled: interviewCount,
        Offered: offeredCount,
        Rejected: rejectedCount,
      },
      applications,
      interviews,
      offers,
      companies,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careertrack_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Reports &amp; Analytics</h2>
          <p className="text-sm text-slate-500">
            Comprehensive placement pipeline metrics and performance insights.
          </p>
        </div>
        <button
          onClick={handleDownloadFullReport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Complete Dossier (JSON)</span>
        </button>
      </div>

      {/* Top 4 Stat Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-[#142D4E]">{totalApps}</div>
          <div className="text-xs text-slate-500 mt-1">Total Applications</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-[#142D4E]">{interviews.length}</div>
          <div className="text-xs text-slate-500 mt-1">Interviews</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-emerald-600">{offeredCount}</div>
          <div className="text-xs text-slate-500 mt-1">Offers Received</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Rejections</div>
        </div>
      </div>

      {/* Visual Insights Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Applications by Status */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#142D4E]">Applications by Status</h3>
            <span className="text-xs text-slate-400">DBMS Group By Simulation</span>
          </div>
          <div className="p-5 space-y-3.5 text-xs">
            {/* Applied */}
            <div className="flex items-center justify-between gap-3">
              <span className="w-32 font-medium text-slate-700">Applied</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${totalApps ? (appliedCount / totalApps) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-slate-800">{appliedCount}</span>
            </div>

            {/* Shortlisted */}
            <div className="flex items-center justify-between gap-3">
              <span className="w-32 font-medium text-purple-700">Shortlisted</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${totalApps ? (shortlistedCount / totalApps) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-slate-800">{shortlistedCount}</span>
            </div>

            {/* Interview Scheduled */}
            <div className="flex items-center justify-between gap-3">
              <span className="w-32 font-medium text-amber-700">Interview Scheduled</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${totalApps ? (interviewCount / totalApps) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-slate-800">{interviewCount}</span>
            </div>

            {/* Offered */}
            <div className="flex items-center justify-between gap-3">
              <span className="w-32 font-medium text-emerald-700">Offered</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${totalApps ? (offeredCount / totalApps) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-slate-800">{offeredCount}</span>
            </div>

            {/* Rejected */}
            <div className="flex items-center justify-between gap-3">
              <span className="w-32 font-medium text-rose-700">Rejected</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${totalApps ? (rejectedCount / totalApps) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-slate-800">{rejectedCount}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Applications by Company */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#142D4E]">Applications by Company</h3>
            <span className="text-xs text-slate-400">Top Recruiters</span>
          </div>
          <div className="p-5 space-y-3.5 text-xs">
            {sortedCompanyList.map(([compName, count]) => (
              <div key={compName} className="flex items-center justify-between gap-3">
                <span className="w-32 font-medium text-slate-800 truncate" title={compName}>
                  {compName}
                </span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563A6] rounded-full transition-all"
                    style={{ width: `${(count / maxCompanyCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-bold text-slate-800">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Offer Rate (Donut Gauge) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col items-center justify-center p-6 text-center">
          <div className="text-sm font-bold text-[#142D4E] mb-4">Offer Conversion Rate</div>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="48"
                stroke="#E2E8F0"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="48"
                stroke="#1765D1"
                strokeWidth="12"
                strokeDasharray={`${(parseFloat(offerRate) / 100) * 301.6} 301.6`}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-[#142D4E]">{offerRate}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Offer Rate</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 font-medium">
            <strong>{offeredCount} offers</strong> from {totalApps} sent applications
          </p>
        </div>

        {/* Card 4: Highest Package Summary Card */}
        <div className="rounded-xl border border-[#BBF7D0] bg-gradient-to-b from-[#EAF8F0] to-[#DCF5E6] shadow-xs flex flex-col items-center justify-center p-6 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-[#15803D] mb-3">
            Highest Package Record
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/15 text-[#15803D] flex items-center justify-center shadow-inner mb-3">
            <Award className="w-8 h-8" />
          </div>
          <div className="text-3xl font-extrabold text-[#142D4E]">
            ₹ {highestOffer ? highestOffer.packageLpa.toFixed(2) : '0.00'} LPA
          </div>
          <div className="text-sm font-bold text-[#15803D] mt-1">
            {highestOffer ? highestOffer.companyName : 'None yet'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {highestOffer?.role} &bull; {highestOffer?.offerStatus}
          </div>
        </div>
      </div>
    </div>
  );
};
