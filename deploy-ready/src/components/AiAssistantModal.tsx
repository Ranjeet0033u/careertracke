import React, { useState } from 'react';
import { X, Sparkles, Send, Copy, Check, MessageSquare, Briefcase, FileText } from 'lucide-react';
import { Application, Company } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  companies: Company[];
  selectedApp?: Application | null;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  applications,
  companies,
  selectedApp,
}) => {
  const [appId, setAppId] = useState<number>(selectedApp?.id || applications[0]?.id || 1);
  const [mode, setMode] = useState<'interview_prep' | 'follow_up' | 'referral'>('interview_prep');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (selectedApp) {
      setAppId(selectedApp.id);
    }
  }, [selectedApp]);

  if (!isOpen) return null;

  const currentApp = applications.find((a) => a.id === appId) || applications[0];
  const company = companies.find((c) => c.id === currentApp?.companyId);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedContent('');

    // Prepare prompt
    const role = currentApp?.role || 'Software Engineer';
    const compName = currentApp?.companyName || 'Technology Firm';
    const appType = currentApp?.type || 'Job';

    // Simulate smart AI generation or smart response
    setTimeout(() => {
      if (mode === 'interview_prep') {
        setGeneratedContent(
          `### 🎯 Interview Preparation Kit for ${role} at ${compName} (${appType})\n\n` +
          `#### 1. Technical & Role-Specific Questions\n` +
          `* **Question:** How do you approach designing scalable systems or object-oriented components in Java/TypeScript?\n` +
          `  * *Strategy:* Mention separation of concerns, DAO pattern for database decoupling, and immutability where applicable.\n` +
          `* **Question:** Explain how database transactions and ACID properties protect integrity in multi-table operations (e.g. applications & offers).\n` +
          `  * *Strategy:* Emphasize atomicity during status updates and foreign key cascading constraints.\n` +
          `* **Question:** Describe a technical challenge you faced in a recent academic project and how you debugged it.\n` +
          `  * *Strategy:* Use the STAR method (Situation, Task, Action, Result).\n\n` +
          `#### 2. Behavioral & Company Alignment Questions\n` +
          `* **Question:** Why do you want to join ${compName}?\n` +
          `  * *Strategy:* Mention their product innovations, engineering standards, and how your skills directly contribute.\n` +
          `* **Question:** How do you prioritize tasks when juggling multiple deadlines or coursework?\n\n` +
          `#### 3. Smart Questions to Ask the Interviewer\n` +
          `1. "What does a typical day look like for a ${role} on the engineering team?"\n` +
          `2. "What are the key technical initiatives planned for the upcoming quarter that this position will touch?"`
        );
      } else if (mode === 'follow_up') {
        setGeneratedContent(
          `Subject: Polite Follow-up regarding application for ${role} — Ranjeet P I\n\n` +
          `Dear Hiring Team at ${compName},\n\n` +
          `I hope this email finds you well.\n\n` +
          `I am writing to politely check in on the status of my application for the ${role} (${appType}) position, which I submitted on ${currentApp?.appliedDate}.\n\n` +
          `I remain enthusiastic about the opportunity to contribute to ${compName} with my background in computer science, software design, and database engineering. Please let me know if there are any additional materials or details I can provide to support my candidacy.\n\n` +
          `Thank you very much for your time and consideration.\n\n` +
          `Warm regards,\n` +
          `Ranjeet P I\n` +
          `B.Tech Computer Science & Engineering\n` +
          `Email: praveen28345@gmail.com`
        );
      } else {
        setGeneratedContent(
          `Hi [Alumni / Recruiter Name],\n\n` +
          `I came across your profile and was impressed by your journey at ${compName}. I am a Computer Science undergraduate student currently applying for the ${role} opening.\n\n` +
          `I have built projects demonstrating full-stack architecture, relational database design, and object-oriented systems. If you have 5 minutes, I would appreciate the chance to learn more about the team culture at ${compName}, or if you would be open to submitting a referral for my application.\n\n` +
          `Thank you so much for your time!\n\n` +
          `Best regards,\n` +
          `Ranjeet P I`
        );
      }
      setLoading(false);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#142D4E]">AI Career &amp; Prep Assistant</h3>
              <p className="text-xs text-slate-500">
                Tailored interview questions, polite follow-ups, and networking drafts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form controls */}
        <div className="p-6 space-y-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Application</label>
              <select
                value={appId}
                onChange={(e) => setAppId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.role} — {a.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Generation Mode</label>
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as 'interview_prep' | 'follow_up' | 'referral')
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="interview_prep">🎯 Interview Q&amp;A Kit</option>
                <option value="follow_up">✉️ Recruiter Follow-up Email</option>
                <option value="referral">🤝 LinkedIn Cold Outreach / Referral</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Generating tailored content...' : 'Generate with CareerTrack AI'}</span>
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {generatedContent ? (
            <div className="relative">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Generated Draft
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to clipboard' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedContent}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-300 mb-2" />
              <p className="font-semibold text-slate-700">Ready to assist your preparation</p>
              <p className="text-[11px] mt-1 text-slate-500">
                Choose an application and click &quot;Generate with CareerTrack AI&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
