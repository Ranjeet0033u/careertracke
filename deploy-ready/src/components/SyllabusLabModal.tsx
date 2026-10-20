import React, { useState } from 'react';
import {
  Database,
  Code2,
  BookOpen,
  Play,
  CheckCircle,
  Copy,
  Table,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Application, Company, Interview, Offer } from '../types';

interface SyllabusLabProps {
  applications: Application[];
  companies: Company[];
  interviews: Interview[];
  offers: Offer[];
}

export const SyllabusLabModal: React.FC<SyllabusLabProps> = ({
  applications,
  companies,
  interviews,
  offers,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sql' | 'java_oop' | 'viva'>('sql');
  const [selectedQueryId, setSelectedQueryId] = useState<string>('view_app_details');
  const [queryOutput, setQueryOutput] = useState<any[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries from queries.sql & schema.sql
  const SQL_PRESETS = [
    {
      id: 'view_app_details',
      title: 'View 1: view_application_details',
      description: 'Joined relation of applications, companies, and offer package',
      sql: `SELECT a.application_id, c.name AS company_name, c.location, a.role, a.type, a.status, o.package AS offer_package
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
LEFT JOIN offers o ON a.application_id = o.application_id;`,
      execute: () => {
        return applications.map((a) => {
          const comp = companies.find((c) => c.id === a.companyId);
          const off = offers.find((o) => o.applicationId === a.id);
          return {
            application_id: a.id,
            company_name: comp?.name || a.companyName,
            location: comp?.location || 'India',
            role: a.role,
            type: a.type,
            status: a.status,
            offer_package: off ? `₹${off.packageLpa.toFixed(2)} LPA` : 'NULL',
          };
        });
      },
    },
    {
      id: 'view_status_summary',
      title: 'View 2: view_status_summary',
      description: 'Application count grouped by status (GROUP BY status)',
      sql: `SELECT status, COUNT(*) AS total_count
FROM applications
GROUP BY status;`,
      execute: () => {
        const counts: { [s: string]: number } = {};
        applications.forEach((a) => {
          counts[a.status] = (counts[a.status] || 0) + 1;
        });
        return Object.entries(counts).map(([status, total_count]) => ({
          status,
          total_count,
        }));
      },
    },
    {
      id: 'view_upcoming_followups',
      title: 'View 3: view_upcoming_followups',
      description: 'Follow-ups scheduled within target range',
      sql: `SELECT a.application_id, c.name AS company_name, a.role, a.follow_up_date
FROM applications a
INNER JOIN companies c ON a.company_id = c.company_id
WHERE a.follow_up_date IS NOT NULL
ORDER BY a.follow_up_date ASC;`,
      execute: () => {
        return applications
          .filter((a) => a.followUpDate)
          .sort((a, b) => ((a.followUpDate || '') > (b.followUpDate || '') ? 1 : -1))
          .map((a) => ({
            application_id: a.id,
            company_name: a.companyName,
            role: a.role,
            follow_up_date: a.followUpDate,
          }));
      },
    },
    {
      id: 'nested_subquery',
      title: 'Query: Nested Subquery with AVG(package)',
      description: 'Offers with package strictly higher than average (DBMS Unit I)',
      sql: `SELECT offer_id, application_id, package, deadline, offer_status
FROM offers
WHERE package > (SELECT AVG(package) FROM offers);`,
      execute: () => {
        const avg =
          offers.length > 0
            ? offers.reduce((acc, o) => acc + o.packageLpa, 0) / offers.length
            : 0;
        return offers
          .filter((o) => o.packageLpa > avg)
          .map((o) => ({
            offer_id: o.id,
            application_id: o.applicationId,
            company_name: o.companyName,
            package: `₹${o.packageLpa.toFixed(2)} LPA (Avg is ₹${avg.toFixed(2)})`,
            offer_status: o.offerStatus,
          }));
      },
    },
    {
      id: 'plsql_trigger',
      title: 'PL/SQL Trigger: trg_after_offer_insert',
      description: 'Automates status update when an offer is placed (DBMS Unit II)',
      sql: `CREATE OR REPLACE TRIGGER trg_after_offer_insert
AFTER INSERT ON offers
FOR EACH ROW
BEGIN
    UPDATE applications
    SET status = 'Offered'
    WHERE application_id = :NEW.application_id;
END;`,
      execute: () => {
        return [
          {
            trigger_name: 'trg_after_offer_insert',
            event: 'AFTER INSERT ON offers',
            timing: 'ROW LEVEL',
            action: 'UPDATE applications SET status = "Offered"',
            status: 'ACTIVE & ENFORCED IN STATE',
          },
        ];
      },
    },
  ];

  const currentPreset =
    SQL_PRESETS.find((p) => p.id === selectedQueryId) || SQL_PRESETS[0];

  const runQuery = () => {
    setQueryOutput(currentPreset.execute());
  };

  const copySql = () => {
    navigator.clipboard.writeText(currentPreset.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">
              DBMS &amp; Java Syllabus Lab
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Academic Hub
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Interactive SQL execution, OOP class hierarchy, and college viva evaluation sheet.
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'sql'
                ? 'bg-[#2563A6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Interactive SQL</span>
          </button>
          <button
            onClick={() => setActiveSubTab('java_oop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'java_oop'
                ? 'bg-[#2563A6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Java OOP Hierarchy</span>
          </button>
          <button
            onClick={() => setActiveSubTab('viva')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'viva'
                ? 'bg-[#2563A6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Viva Q&amp;A Sheet</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: Interactive SQL Runner */}
      {activeSubTab === 'sql' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Presets List (4 cols) */}
            <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                SQL Views &amp; Queries
              </h3>
              {SQL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedQueryId(preset.id);
                    setQueryOutput(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                    selectedQueryId === preset.id
                      ? 'border-blue-500 bg-blue-50/60 font-semibold text-blue-900 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{preset.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>

            {/* SQL Terminal & Result (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-[#0F172A] rounded-xl border border-slate-700 shadow-sm overflow-hidden text-xs">
                <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-slate-300">
                  <span className="font-mono font-medium text-[11px] text-slate-400">
                    job_tracker &gt; {currentPreset.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySql}
                      className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={runQuery}
                      className="px-3 py-1 rounded bg-[#2563A6] hover:bg-blue-600 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Execute Query</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                  {currentPreset.sql}
                </div>
              </div>

              {/* Execution Result Table */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">
                      Query Result Set {queryOutput ? `(${queryOutput.length} rows returned)` : ''}
                    </span>
                  </div>
                  {!queryOutput && (
                    <span className="text-[11px] text-slate-400">Click &quot;Execute Query&quot; above to run</span>
                  )}
                </div>

                <div className="overflow-x-auto max-h-80">
                  {queryOutput ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAFCFE] text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                        <tr>
                          {Object.keys(queryOutput[0] || {}).map((col) => (
                            <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {queryOutput.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      Run the query to preview live database records.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Java OOP Architecture */}
      {activeSubTab === 'java_oop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-[#142D4E]">
                Inheritance &amp; Polymorphism (Unit II)
              </h3>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>Abstract Class:</strong> <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">Application.java</code> is the abstract parent containing protected fields (<code className="font-mono">applicationId</code>, <code className="font-mono">role</code>, <code className="font-mono">status</code>) and declares the abstract method:
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`public abstract class Application {
    public abstract String showDetails();
}`}
              </pre>
              <p>
                <strong>Method Overriding:</strong> <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">JobApplication</code> and <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">InternshipApplication</code> override <code className="font-mono">showDetails()</code>. When invoked at runtime, JVM dynamic method dispatch executes the concrete subclass implementation.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-[#142D4E]">
                Streams API &amp; Lambdas (Unit V)
              </h3>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>Grouping &amp; Map-Reduce:</strong> Status aggregations in <code className="font-mono">ReportUtil.java</code> use:
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`Map<String, Long> summary = applications.stream()
    .collect(Collectors.groupingBy(
        Application::getStatus,
        Collectors.counting()
    ));`}
              </pre>
              <p>
                <strong>Highest Package OptionalDouble:</strong>
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`OptionalDouble max = offers.stream()
    .mapToDouble(Offer::getPackageLpa)
    .max();`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Viva Q&A Sheet */}
      {activeSubTab === 'viva' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Java Unit II
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Why is Application an abstract class instead of an interface?
              </h4>
              <p className="text-slate-600 leading-relaxed">
                An application requires shared concrete state (e.g. <code className="font-mono">applicationId</code>, <code className="font-mono">companyId</code>, <code className="font-mono">appliedDate</code>) along with common getter/setter logic that all subclasses inherit, while enforcing polymorphic display via <code className="font-mono">showDetails()</code>.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                DBMS Unit I
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                How is the 1-to-1 relationship between Application and Offer enforced?
              </h4>
              <p className="text-slate-600 leading-relaxed">
                In the <code className="font-mono">offers</code> table schema, <code className="font-mono">application_id</code> has both a Foreign Key constraint pointing to <code className="font-mono">applications(application_id)</code> and a <code className="font-mono">UNIQUE</code> constraint, preventing duplicate offer records for the same application.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Java Unit III
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                What is InvalidStatusException and why is it a checked exception?
              </h4>
              <p className="text-slate-600 leading-relaxed">
                It extends <code className="font-mono">Exception</code>, compelling the calling method (<code className="font-mono">Main.java</code>) to handle it with a <code className="font-mono">try-catch</code> block. This prevents illegal application statuses like &quot;Accepted&quot; (valid only for offers) from contaminating the database.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                DBMS Unit II
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Explain the trg_after_offer_insert trigger.
              </h4>
              <p className="text-slate-600 leading-relaxed">
                It is an <code className="font-mono">AFTER INSERT</code> row-level trigger that automatically synchronizes the parent application status to <code className="font-mono">&apos;Offered&apos;</code> whenever an offer record is created, maintaining referential and workflow consistency.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
