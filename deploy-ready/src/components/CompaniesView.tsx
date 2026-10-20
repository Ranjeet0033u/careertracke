import React, { useState } from 'react';
import { Building2, MapPin, Mail, Globe, Plus, Edit2, Trash2, Search, Briefcase } from 'lucide-react';
import { Company, Application } from '../types';

interface CompaniesViewProps {
  companies: Company[];
  applications: Application[];
  onSaveCompany: (companyData: Omit<Company, 'id'> & { id?: number }) => void;
  onDeleteCompany: (id: number) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  applications,
  onSaveCompany,
  onDeleteCompany,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [roleOffered, setRoleOffered] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [search, setSearch] = useState('');

  const startEdit = (c: Company) => {
    setEditingId(c.id);
    setName(c.name);
    setLocation(c.location);
    setRoleOffered(c.roleOffered || '');
    setContactEmail(c.contactEmail);
    setWebsite(c.website || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setRoleOffered('');
    setContactEmail('');
    setWebsite('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactEmail.trim()) return;

    onSaveCompany({
      id: editingId || undefined,
      name: name.trim(),
      location: location.trim() || 'Remote',
      roleOffered: roleOffered.trim() || 'Engineering',
      contactEmail: contactEmail.trim(),
      website: website.trim() || undefined,
    });
    resetForm();
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Companies</h2>
        <p className="text-sm text-slate-500">
          Manage recruitment organization profiles and contacts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Add / Edit Company (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142D4E]">
              {editingId ? 'Edit Company' : 'Add New Company'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                + Add New Instead
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                placeholder="e.g. ABC Technologies"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location *</label>
              <input
                type="text"
                placeholder="e.g. Chennai, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Email *</label>
              <input
                type="email"
                placeholder="e.g. hr@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Role Offered</label>
              <input
                type="text"
                placeholder="e.g. Software Developer Intern"
                value={roleOffered}
                onChange={(e) => setRoleOffered(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website URL (Optional)</label>
              <input
                type="url"
                placeholder="https://company.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-[#1765D1] hover:bg-[#1352AA] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {editingId ? 'Update Company' : 'Save Company'}
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

        {/* Right Table: Companies List (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500">{filteredCompanies.length} companies</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFCFE] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-10">#</th>
                  <th className="py-2.5 px-4">Company Name</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Contact Email</th>
                  <th className="py-2.5 px-4 text-center">Applications</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((c, index) => {
                  const appsCount = applications.filter((a) => a.companyId === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        {c.roleOffered && (
                          <div className="text-[11px] text-slate-500">{c.roleOffered}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <a
                          href={`mailto:${c.contactEmail}`}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>{c.contactEmail}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                          {appsCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(c)}
                            title="Edit Company"
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${c.name}? Note: Applications linked to this company will also be removed (ON DELETE CASCADE in database).`
                                )
                              ) {
                                onDeleteCompany(c.id);
                              }
                            }}
                            title="Delete Company"
                            className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
