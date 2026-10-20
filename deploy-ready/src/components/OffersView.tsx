import React, { useState } from 'react';
import { Award, Plus, DollarSign, Calendar, CheckCircle2, XCircle, Trash2, Edit2, TrendingUp, Sparkles } from 'lucide-react';
import { Offer, Application, OfferStatus } from '../types';
import { getOfferStatusBadge } from '../utils/statusBadges';

interface OffersViewProps {
  offers: Offer[];
  applications: Application[];
  onSaveOffer: (offerData: Omit<Offer, 'id'> & { id?: number }) => void;
  onDeleteOffer: (id: number) => void;
  onUpdateOfferStatus: (id: number, status: OfferStatus) => void;
}

export const OffersView: React.FC<OffersViewProps> = ({
  offers,
  applications,
  onSaveOffer,
  onDeleteOffer,
  onUpdateOfferStatus,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [applicationId, setApplicationId] = useState<number>(applications[0]?.id || 1);
  const [packageLpa, setPackageLpa] = useState<number>(10.0);
  const [deadline, setDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [offerStatus, setOfferStatus] = useState<OfferStatus>('Pending');
  const [joiningDate, setJoiningDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Highest Package calculation
  const highestOffer = offers.reduce<Offer | null>((max, curr) => {
    if (!max || curr.packageLpa > max.packageLpa) return curr;
    return max;
  }, null);

  const avgPackage =
    offers.length > 0
      ? (offers.reduce((acc, o) => acc + o.packageLpa, 0) / offers.length).toFixed(1)
      : '0';

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setPackageLpa(10.0);
    setDeadline(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setOfferStatus('Pending');
    setJoiningDate('');
    setNotes('');
  };

  const startEdit = (o: Offer) => {
    setEditingId(o.id);
    setApplicationId(o.applicationId);
    setPackageLpa(o.packageLpa);
    setDeadline(o.deadline);
    setOfferStatus(o.offerStatus);
    setJoiningDate(o.joiningDate || '');
    setNotes(o.notes || '');
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const app = applications.find((a) => a.id === applicationId);
    const companyName = app ? app.companyName : 'Company';
    const role = app ? app.role : 'Position';

    onSaveOffer({
      id: editingId || undefined,
      applicationId,
      companyName,
      role,
      packageLpa: Number(packageLpa),
      deadline,
      offerStatus,
      joiningDate: joiningDate || undefined,
      notes: notes.trim() || undefined,
    });
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#142D4E] tracking-tight">Offers &amp; Packages</h2>
          <p className="text-sm text-slate-500">
            Compare packages, track offer deadlines, and finalize acceptance.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1765D1] hover:bg-[#1352AA] text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Offer</span>
        </button>
      </div>

      {/* Highest Package Highlight Card (Matching Design) */}
      {highestOffer && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#EAF8F0] via-[#E1F7EA] to-[#D5F3E1] border border-[#BBF7D0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/20 text-[#15803D] flex items-center justify-center shrink-0 shadow-inner border border-emerald-300/40">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
                Highest Package Secured
              </div>
              <div className="text-3xl font-extrabold text-[#142D4E] mt-0.5">
                ₹ {highestOffer.packageLpa.toFixed(2)} LPA
              </div>
              <div className="text-sm font-semibold text-emerald-900 mt-0.5">
                {highestOffer.companyName} &bull; <span className="font-normal text-slate-600">{highestOffer.role}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
              Status: {highestOffer.offerStatus}
            </span>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Offers Received</div>
          <div className="text-2xl font-bold text-[#142D4E] mt-1">{offers.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Enforcing DBMS 1-to-1 constraint</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Average CTC / Package</div>
          <div className="text-2xl font-bold text-[#142D4E] mt-1">₹ {avgPackage} LPA</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Calculated using Java Stream mapToDouble</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Accepted Offers</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {offers.filter((o) => o.offerStatus === 'Accepted').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready for joining</div>
        </div>
      </div>

      {/* Add / Edit Offer Form Modal / Collapsible */}
      {showAddForm && (
        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-[#142D4E]">
              {editingId ? 'Edit Offer Details' : 'Record New Job / Internship Offer'}
            </h3>
            <button
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Application *</label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.role} — {app.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Package (in LPA) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 12.0"
                value={packageLpa}
                onChange={(e) => setPackageLpa(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Acceptance Deadline *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Decision Status</label>
              <select
                value={offerStatus}
                onChange={(e) => setOfferStatus(e.target.value as OfferStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending">Pending Decision</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Declined</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Joining Date (Optional)</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Notes &amp; Retention Terms</label>
              <input
                type="text"
                placeholder="Bond period, perks, relocation allowance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#1765D1] hover:bg-[#1352AA] text-white font-semibold shadow-xs cursor-pointer"
              >
                {editingId ? 'Update Offer' : 'Save Offer Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Offers Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#142D4E]">All Received Offers</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFE] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-10">#</th>
                <th className="py-2.5 px-4">Role &amp; Company</th>
                <th className="py-2.5 px-4">Package</th>
                <th className="py-2.5 px-4">Decision Deadline</th>
                <th className="py-2.5 px-4">Offer Status</th>
                <th className="py-2.5 px-4">Joining Date</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.map((offer, idx) => (
                <tr key={offer.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{offer.role}</div>
                    <div className="text-[11px] text-slate-500">{offer.companyName}</div>
                    {offer.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">{offer.notes}</div>}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-sm text-[#142D4E]">
                      ₹ {offer.packageLpa.toFixed(2)} LPA
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{offer.deadline}</td>
                  <td className="py-3 px-4">
                    <select
                      value={offer.offerStatus}
                      onChange={(e) =>
                        onUpdateOfferStatus(offer.id, e.target.value as OfferStatus)
                      }
                      className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-0.5 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value="Pending">Decision Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Declined</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {offer.joiningDate || <span className="text-slate-400 italic">TBD</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => startEdit(offer)}
                        title="Edit Offer"
                        className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this offer record?')) {
                            onDeleteOffer(offer.id);
                          }
                        }}
                        title="Delete Offer"
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
  );
};
