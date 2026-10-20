import React from 'react';
import {
  LayoutGrid,
  FileText,
  Building2,
  CalendarCheck2,
  Clock,
  Award,
  BarChart3,
  Database,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  overdueCount: number;
  offersCount: number;
  onOpenAiHelper?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  overdueCount,
  offersCount,
  onOpenAiHelper,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutGrid },
    { id: 'applications' as NavTab, label: 'Applications', icon: FileText },
    { id: 'companies' as NavTab, label: 'Companies', icon: Building2 },
    { id: 'interviews' as NavTab, label: 'Interviews', icon: CalendarCheck2 },
    {
      id: 'followups' as NavTab,
      label: 'Follow-ups',
      icon: Clock,
      badge: overdueCount > 0 ? `${overdueCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'offers' as NavTab,
      label: 'Offers',
      icon: Award,
      badge: offersCount > 0 ? `${offersCount}` : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart3 },
    {
      id: 'syllabus_lab' as NavTab,
      label: 'DBMS & Java Lab',
      icon: Database,
      badge: 'SQL & Viva',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
    },
  ];

  return (
    <aside className="w-64 min-w-64 bg-[#0F223D] text-slate-300 flex flex-col fixed top-0 bottom-0 left-0 z-40 border-r border-white/5 select-none transition-all">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-white/10 flex flex-col gap-3">
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-3 text-left group transition-transform focus:outline-none"
        >
          <img
            src="/mascot.png"
            alt="CareerTrack Mascot"
            className="w-10 h-10 rounded-xl object-cover bg-[#1E3A5F] shadow-md border border-white/20 group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-white tracking-tight">CareerTrack</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 italic">Your career journey, organized.</p>
          </div>
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#2563A6] text-white shadow-sm shadow-blue-900/30 font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* AI Career Assistant Pill */}
        {onOpenAiHelper && (
          <div className="pt-3">
            <button
              onClick={onOpenAiHelper}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 text-purple-200 border border-purple-500/30 transition-all shadow-sm group"
            >
              <Sparkles className="w-4 h-4 text-purple-300 group-hover:rotate-12 transition-transform" />
              <span>AI Prep &amp; Follow-up Drafter</span>
            </button>
          </div>
        )}
      </nav>

      {/* Sidebar Footer with Student Workspace Info */}
      <div className="p-4 border-t border-white/10 bg-black/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2563A6] text-white flex items-center justify-center font-bold text-sm border border-white/20 shadow-inner shrink-0">
          R
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-white truncate">Ranjeet P I</span>
          <span className="text-[11px] text-slate-400 truncate">Computer Science &amp; Engg</span>
        </div>
      </div>
    </aside>
  );
};
