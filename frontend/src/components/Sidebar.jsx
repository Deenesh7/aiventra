import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  FileSearch,
  Clock,
  Map,
  Brain,
  Image as ImageIcon,
  MessageSquare,
  ShieldAlert,
  Network,
  LogOut,
  Settings,
} from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import clsx from 'clsx';

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/cases', icon: FolderOpen, label: 'Cases' },
  { to: '/app/autopsy', icon: FileSearch, label: 'Autopsy Analyzer' },
  { to: '/app/tod', icon: Clock, label: 'TOD Estimation' },
  { to: '/app/timeline', icon: Network, label: 'Timeline & Evidence' },
  { to: '/app/map', icon: Map, label: 'Crime Scene Map' },
  { to: '/app/risk', icon: ShieldAlert, label: 'Risk & Anomalies' },
  { to: '/app/images', icon: ImageIcon, label: 'Image Analysis' },
  { to: '/app/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { to: '/app/explain', icon: Brain, label: 'Explainability' },
];

export default function Sidebar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Investigator';
  const subLine = profile?.role
    ? profile.role.toUpperCase()
    : (user?.email || 'AIV-0000');

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 border-r border-white/5 bg-ink-950/80 backdrop-blur-xl flex flex-col">
      <div className="p-5 border-b border-white/5">
        <NavLink to="/app/dashboard">
          <Logo size="sm" />
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <div className="px-3 mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          Investigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group relative',
                isActive
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon-cyan rounded-r shadow-neon-cyan" />
                )}
                <item.icon size={16} className="flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {user && (
          <div className="panel p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center font-display font-bold text-ink-950 text-sm flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{displayName}</div>
              <div className="text-[10px] font-mono text-neon-cyan/70 truncate">
                {subLine}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-neon-red hover:bg-neon-red/5 transition-colors"
        >
          <LogOut size={14} />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
