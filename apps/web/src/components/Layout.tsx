import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Clock, FileText, User, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export const Layout = () => {
  const { user, clearAuth, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = user?.fullName ?? user?.email?.split('@')[0] ?? 'User';

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
    { path: '/attendance', label: 'Riwayat', icon: <Clock className="w-5 h-5" /> },
    { path: '/leaves', label: 'Pengajuan', icon: <FileText className="w-5 h-5" /> },
    { path: '/settings', label: 'Profil', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans pb-[env(safe-area-inset-bottom)]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-white border-r flex flex-col z-30 transition-transform duration-300 md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shadow-sm bg-primary text-primary-foreground font-bold text-lg">
            C
          </div>
          <span className="font-bold text-xl tracking-tight">CentroAbsen</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto hidden md:block">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path}
                to={item.path} 
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                )}
              >
                <span className={cn(isActive ? "text-primary" : "text-muted-foreground")}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t hidden md:block">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-slate-50 border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shrink-0">
              <span className="font-semibold">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" title={displayName}>{displayName}</p>
              <p className="text-xs text-muted-foreground truncate font-medium">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
          <div className="flex items-center md:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shadow-sm bg-primary text-primary-foreground font-bold text-lg">
              C
            </div>
            <span className="font-bold text-lg tracking-tight">CentroAbsen</span>
          </div>
          <div className="hidden md:flex items-center">
             <h2 className="text-xl font-semibold capitalize">{location.pathname.split('/')[1] || 'Beranda'}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-16 md:pb-0">
          <div className="mx-auto max-w-5xl p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-40 pb-[env(safe-area-inset-bottom)] px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
