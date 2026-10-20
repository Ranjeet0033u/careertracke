import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ApplicationsView } from './components/ApplicationsView';
import { CompaniesView } from './components/CompaniesView';
import { InterviewsView } from './components/InterviewsView';
import { FollowUpsView } from './components/FollowUpsView';
import { OffersView } from './components/OffersView';
import { ReportsView } from './components/ReportsView';
import { SyllabusLabModal } from './components/SyllabusLabModal';
import { AddEditApplicationModal } from './components/AddEditApplicationModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import {
  INITIAL_COMPANIES,
  INITIAL_APPLICATIONS,
  INITIAL_INTERVIEWS,
  INITIAL_OFFERS,
} from './data/initialData';
import {
  Application,
  Company,
  Interview,
  Offer,
  NavTab,
  ApplicationStatus,
  InterviewResult,
  OfferStatus,
} from './types';
import { Menu, CheckCircle2 } from 'lucide-react';

export default function App() {
  // 1. Persistent State
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('careertrack_companies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_COMPANIES;
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('careertrack_applications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_APPLICATIONS;
  });

  const [interviews, setInterviews] = useState<Interview[]>(() => {
    const saved = localStorage.getItem('careertrack_interviews');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_INTERVIEWS;
  });

  const [offers, setOffers] = useState<Offer[]>(() => {
    const saved = localStorage.getItem('careertrack_offers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_OFFERS;
  });

  // 2. Navigation & Hash
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const hash = window.location.hash.replace('#', '') as NavTab;
    const validTabs: NavTab[] = [
      'dashboard',
      'applications',
      'companies',
      'interviews',
      'followups',
      'offers',
      'reports',
      'syllabus_lab',
    ];
    return validTabs.includes(hash) ? hash : 'dashboard';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 3. Modals & Notifications
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetApp, setAiTargetApp] = useState<Application | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('careertrack_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('careertrack_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('careertrack_interviews', JSON.stringify(interviews));
  }, [interviews]);

  useEffect(() => {
    localStorage.setItem('careertrack_offers', JSON.stringify(offers));
  }, [offers]);

  // Sync hash
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = [
        'dashboard',
        'applications',
        'companies',
        'interviews',
        'followups',
        'offers',
        'reports',
        'syllabus_lab',
      ];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    window.location.hash = tab;
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. Handlers for Applications
  const handleSaveApplication = (appData: Omit<Application, 'id'> & { id?: number }) => {
    if (appData.id) {
      setApplications((prev) =>
        prev.map((a) => (a.id === appData.id ? ({ ...appData, id: appData.id } as Application) : a))
      );
      showToast('Application updated successfully.');
    } else {
      const newId = applications.length > 0 ? Math.max(...applications.map((a) => a.id)) + 1 : 1;
      const newApp: Application = {
        ...appData,
        id: newId,
      };
      setApplications((prev) => [newApp, ...prev]);
      showToast('New application recorded.');
    }
    setEditingApp(null);
  };

  const handleDeleteApplication = (id: number) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    // ON DELETE CASCADE for interviews and offers
    setInterviews((prev) => prev.filter((i) => i.applicationId !== id));
    setOffers((prev) => prev.filter((o) => o.applicationId !== id));
    showToast('Application removed (cascaded).');
  };

  const handleUpdateStatus = (id: number, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    showToast(`Status updated to "${status}".`);
  };

  const handleMarkFollowUpDone = (appId: number) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, followUpDate: null } : a))
    );
    showToast('Follow-up marked as completed.');
  };

  const handleSetFollowUpDate = (appId: number, date: string | null) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, followUpDate: date } : a))
    );
    showToast(date ? `Follow-up scheduled for ${date}.` : 'Follow-up reminder removed.');
  };

  // 5. Handlers for Companies
  const handleSaveCompany = (compData: Omit<Company, 'id'> & { id?: number }) => {
    if (compData.id) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === compData.id ? ({ ...compData, id: compData.id } as Company) : c))
      );
      // Update company name in applications
      setApplications((prev) =>
        prev.map((a) =>
          a.companyId === compData.id ? { ...a, companyName: compData.name } : a
        )
      );
      showToast('Company details updated.');
    } else {
      const newId = companies.length > 0 ? Math.max(...companies.map((c) => c.id)) + 1 : 1;
      const newCompany: Company = {
        ...compData,
        id: newId,
      };
      setCompanies((prev) => [newCompany, ...prev]);
      showToast(`Company "${newCompany.name}" added.`);
    }
  };

  const handleDeleteCompany = (id: number) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    // ON DELETE CASCADE
    const affectedApps = applications.filter((a) => a.companyId === id).map((a) => a.id);
    setApplications((prev) => prev.filter((a) => a.companyId !== id));
    setInterviews((prev) => prev.filter((i) => !affectedApps.includes(i.applicationId)));
    setOffers((prev) => prev.filter((o) => !affectedApps.includes(o.applicationId)));
    showToast('Company deleted and linked applications cascaded.');
  };

  // 6. Handlers for Interviews
  const handleSaveInterview = (interviewData: Omit<Interview, 'id'> & { id?: number }) => {
    if (interviewData.id) {
      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewData.id ? ({ ...interviewData, id: interviewData.id } as Interview) : i
        )
      );
      showToast('Interview round updated.');
    } else {
      const newId = interviews.length > 0 ? Math.max(...interviews.map((i) => i.id)) + 1 : 1;
      const newInterview: Interview = {
        ...interviewData,
        id: newId,
      };
      setInterviews((prev) => [newInterview, ...prev]);

      // If pending interview is scheduled, update parent application status if needed
      setApplications((prev) =>
        prev.map((a) =>
          a.id === interviewData.applicationId && a.status === 'Applied'
            ? { ...a, status: 'Interview Scheduled' }
            : a
        )
      );
      showToast('Interview scheduled.');
    }
  };

  const handleDeleteInterview = (id: number) => {
    setInterviews((prev) => prev.filter((i) => i.id !== id));
    showToast('Interview record deleted.');
  };

  const handleUpdateInterviewResult = (id: number, result: InterviewResult) => {
    setInterviews((prev) =>
      prev.map((i) => (i.id === id ? { ...i, result } : i))
    );
    showToast(`Interview result set to "${result}".`);
  };

  // 7. Handlers for Offers
  const handleSaveOffer = (offerData: Omit<Offer, 'id'> & { id?: number }) => {
    if (offerData.id) {
      setOffers((prev) =>
        prev.map((o) => (o.id === offerData.id ? ({ ...offerData, id: offerData.id } as Offer) : o))
      );
      showToast('Offer terms updated.');
    } else {
      const newId = offers.length > 0 ? Math.max(...offers.map((o) => o.id)) + 1 : 1;
      const newOffer: Offer = {
        ...offerData,
        id: newId,
      };
      setOffers((prev) => [newOffer, ...prev]);

      // PL/SQL Trigger Simulation: trg_after_offer_insert
      setApplications((prev) =>
        prev.map((a) =>
          a.id === offerData.applicationId ? { ...a, status: 'Offered' } : a
        )
      );
      showToast('Offer recorded! (Application status updated to Offered via Trigger)');
    }
  };

  const handleDeleteOffer = (id: number) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    showToast('Offer record deleted.');
  };

  const handleUpdateOfferStatus = (id: number, status: OfferStatus) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, offerStatus: status } : o))
    );
    showToast(`Offer decision updated to "${status}".`);
  };

  // Overdue follow-up count
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = applications.filter(
    (a) =>
      a.followUpDate &&
      a.followUpDate <= todayStr &&
      a.status !== 'Rejected' &&
      a.status !== 'Offered'
  ).length;

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-slate-800 flex">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F223D] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F223D] z-30 px-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <img src="/mascot.png" alt="CareerTrack" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-white text-base">CareerTrack</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out z-40 fixed lg:static`}
      >
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          overdueCount={overdueCount}
          offersCount={offers.length}
          onOpenAiHelper={() => {
            setAiTargetApp(applications[0] || null);
            setIsAiModalOpen(true);
          }}
        />
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-2xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 lg:ml-64 p-6 sm:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
        {currentTab === 'dashboard' && (
          <DashboardView
            applications={applications}
            interviews={interviews}
            offers={offers}
            companies={companies}
            onNavigate={handleSelectTab}
            onOpenAddModal={() => {
              setEditingApp(null);
              setIsAddModalOpen(true);
            }}
            onEditApp={(app) => {
              setEditingApp(app);
              setIsAddModalOpen(true);
            }}
            onMarkFollowUpDone={handleMarkFollowUpDone}
          />
        )}

        {currentTab === 'applications' && (
          <ApplicationsView
            applications={applications}
            onOpenAddModal={() => {
              setEditingApp(null);
              setIsAddModalOpen(true);
            }}
            onEditApp={(app) => {
              setEditingApp(app);
              setIsAddModalOpen(true);
            }}
            onDeleteApp={handleDeleteApplication}
            onUpdateStatus={handleUpdateStatus}
            onOpenAiHelperForApp={(app) => {
              setAiTargetApp(app);
              setIsAiModalOpen(true);
            }}
          />
        )}

        {currentTab === 'companies' && (
          <CompaniesView
            companies={companies}
            applications={applications}
            onSaveCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
          />
        )}

        {currentTab === 'interviews' && (
          <InterviewsView
            interviews={interviews}
            applications={applications}
            onSaveInterview={handleSaveInterview}
            onDeleteInterview={handleDeleteInterview}
            onUpdateResult={handleUpdateInterviewResult}
          />
        )}

        {currentTab === 'followups' && (
          <FollowUpsView
            applications={applications}
            companies={companies}
            onSetFollowUp={handleSetFollowUpDate}
          />
        )}

        {currentTab === 'offers' && (
          <OffersView
            offers={offers}
            applications={applications}
            onSaveOffer={handleSaveOffer}
            onDeleteOffer={handleDeleteOffer}
            onUpdateOfferStatus={handleUpdateOfferStatus}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            applications={applications}
            interviews={interviews}
            offers={offers}
            companies={companies}
          />
        )}

        {currentTab === 'syllabus_lab' && (
          <SyllabusLabModal
            applications={applications}
            companies={companies}
            interviews={interviews}
            offers={offers}
          />
        )}
      </main>

      {/* Add / Edit Application Modal */}
      <AddEditApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingApp(null);
        }}
        onSave={handleSaveApplication}
        initialApp={editingApp}
        companies={companies}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          setAiTargetApp(null);
        }}
        applications={applications}
        companies={companies}
        selectedApp={aiTargetApp}
      />
    </div>
  );
}
