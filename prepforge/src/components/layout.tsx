import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Hammer, Brain, FileText, History, Home,
  Linkedin, Mail, Code2, BookOpen, LogOut,
  LogIn, Menu, ChevronRight, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps { children: ReactNode }

const sections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/history", label: "History", icon: History },
    ],
  },
  {
    label: "Interview Prep",
    items: [
      { href: "/interview", label: "Mock Interview", icon: Hammer },
      { href: "/aptitude", label: "Aptitude Test", icon: Brain },
      { href: "/leetcode", label: "LeetCode Assistant", icon: Code2 },
      { href: "/question-bank", label: "Question Bank", icon: BookOpen },
    ],
  },
  {
    label: "Profile & Applications",
    items: [
      { href: "/resume", label: "Resume Analyzer", icon: FileText },
      { href: "/linkedin", label: "LinkedIn Optimizer", icon: Linkedin },
      { href: "/cover-letter", label: "Cover Letter", icon: Mail },
    ],
  },
];

function UserSection({ user, isLoading, isAuthenticated, login, logout }: ReturnType<typeof useAuth>) {
  if (isLoading) {
    return <div className="p-3"><div className="h-10 bg-white/5 rounded-xl animate-pulse" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-3">
        <button onClick={login} className="btn-signin">
          <LogIn className="h-4 w-4" />
          Sign In
        </button>
      </div>
    );
  }

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-indigo-500/40">
          <AvatarImage src={user?.profileImageUrl ?? undefined} />
          <AvatarFallback className="text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate">{displayName}</p>
          {user?.email && <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>}
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-medium transition-all"
        style={{ color: "rgba(255,255,255,0.4)" }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign Out
      </button>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, isActive, onClose }: {
  href: string; label: string; icon: React.ElementType; isActive: boolean; onClose?: () => void;
}) {
  return (
    <Link href={href} onClick={onClose}>
      <div className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 text-sm group",
        isActive ? "nav-active font-semibold" : "font-medium"
      )}
        style={!isActive ? { color: "rgba(255,255,255,0.45)" } : undefined}
        onMouseOver={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; } }}
        onMouseOut={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; } }}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 nav-active-bar rounded-r-full" />}
        <Icon className="h-[15px] w-[15px] shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
        <span className="truncate">{label}</span>
        {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
      </div>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const auth = useAuth();

  return (
    <div className="flex flex-col h-full" style={{ background: "hsl(222, 47%, 8%)" }}>
      {/* Logo area */}
      <div className="shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="h-[60px] flex items-center px-4 gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 4px 14px rgba(99,102,241,0.45)" }}>
            <Hammer className="text-white" style={{ height: 17, width: 17 }} />
          </div>
          <div>
            <div className="font-extrabold text-[15px] text-white leading-none">PrepForge</div>
            <div className="flex items-center gap-1 mt-0.5" style={{ color: "rgba(129,140,248,0.8)", fontSize: 10, fontWeight: 500 }}>
              <Zap style={{ height: 9, width: 9 }} />AI Interview Platform
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return <NavItem key={item.href} {...item} isActive={isActive} onClose={onClose} />;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* Auth */}
      <UserSection {...auth} />
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <SidebarContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center h-14 px-4 shrink-0" style={{ background: "hsl(222, 47%, 8%)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg mr-3 transition-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <Hammer className="text-white" style={{ height: 14, width: 14 }} />
            </div>
            <span className="font-extrabold text-sm text-white">PrepForge</span>
          </div>
        </div>

        {/* Main content — light */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
