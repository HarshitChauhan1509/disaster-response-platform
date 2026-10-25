import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Box,
  ClipboardList,
  LogOut,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

export const DashboardLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Command Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Incidents', path: '/incidents', icon: AlertTriangle },
    ...(hasRole('ADMIN', 'COORDINATOR')
      ? [
          { label: 'Responders', path: '/responders', icon: Users },
          { label: 'Resources', path: '/resources', icon: Box },
          { label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList },
        ]
      : [
          { label: 'Resources', path: '/resources', icon: Box },
        ]),
  ];

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    COORDINATOR: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    RESPONDER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">Santrionn Ops</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">DISASTER RESPONSE</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Operational Status Pill in Sidebar */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Telemetry Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              High-concurrency cluster operational
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>INCIDENT COORDINATION CENTER</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile & Role */}
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">{user?.name}</div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>
            </div>

            <Badge
              variant="custom"
              className={cn('text-[10px] font-semibold px-2 py-0.5', roleColors[user?.role || 'RESPONDER'])}
            >
              {user?.role}
            </Badge>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors title='Logout'"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
