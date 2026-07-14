import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  Hammer, Brain, FileText, Activity, TrendingUp,
  Building, Briefcase, Linkedin, Mail, Code2, BookOpen,
  ArrowRight, Target, Sparkles, Zap, Award, Star,
} from "lucide-react";
import {
  useGetInterviewStats, getGetInterviewStatsQueryKey,
  useGetAptitudeStats, getGetAptitudeStatsQueryKey,
  useGetResumeStats, getGetResumeStatsQueryKey,
  useListInterviewSessions, getListInterviewSessionsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { format } from "date-fns";

/* ── Module cards — light background with vivid color accents ── */
const modules = [
  {
    href: "/interview",
    icon: Hammer,
    label: "Mock Interview",
    desc: "AI voice interviews with real-time feedback and score breakdown.",
    tag: "AI Voice",
    accent: "#6366f1",       /* indigo */
    accentLight: "#ede9fe",
    accentText: "#5b21b6",
  },
  {
    href: "/aptitude",
    icon: Brain,
    label: "Aptitude Test",
    desc: "Timed quizzes on quantitative, logical and verbal reasoning.",
    tag: "Timed",
    accent: "#0ea5e9",       /* sky blue */
    accentLight: "#e0f2fe",
    accentText: "#0369a1",
  },
  {
    href: "/leetcode",
    icon: Code2,
    label: "LeetCode Assistant",
    desc: "Hints, approaches, solutions and complexity analysis instantly.",
    tag: "DSA",
    accent: "#10b981",       /* emerald */
    accentLight: "#d1fae5",
    accentText: "#065f46",
  },
  {
    href: "/question-bank",
    icon: BookOpen,
    label: "Question Bank",
    desc: "Targeted questions by role, company and category with answers.",
    tag: "Browse",
    accent: "#f59e0b",       /* amber */
    accentLight: "#fef3c7",
    accentText: "#92400e",
  },
  {
    href: "/resume",
    icon: FileText,
    label: "Resume Analyzer",
    desc: "ATS score, keyword gaps, and section-by-section improvement tips.",
    tag: "ATS",
    accent: "#f43f5e",       /* rose */
    accentLight: "#ffe4e6",
    accentText: "#9f1239",
  },
  {
    href: "/linkedin",
    icon: Linkedin,
    label: "LinkedIn Optimizer",
    desc: "Headline rewrite, summary improvements, and skills gap analysis.",
    tag: "Profile",
    accent: "#0284c7",       /* blue */
    accentLight: "#dbeafe",
    accentText: "#1e40af",
  },
  {
    href: "/cover-letter",
    icon: Mail,
    label: "Cover Letter",
    desc: "Generate tailored, high-impact cover letters for any role.",
    tag: "AI Write",
    accent: "#a855f7",       /* purple */
    accentLight: "#f3e8ff",
    accentText: "#6b21a8",
  },
];

/* ── Stat definitions ── */
const STATS = [
  { icon: TrendingUp, label: "Avg Interview Score", color: "#6366f1", bg: "#ede9fe" },
  { icon: Activity,   label: "Avg Aptitude Score",  color: "#0ea5e9", bg: "#e0f2fe" },
  { icon: Target,     label: "Avg ATS Score",       color: "#10b981", bg: "#d1fae5" },
  { icon: Building,   label: "Top Target",          color: "#f59e0b", bg: "#fef3c7" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: intStats } = useGetInterviewStats({ query: { queryKey: getGetInterviewStatsQueryKey() } });
  const { data: aptStats } = useGetAptitudeStats({ query: { queryKey: getGetAptitudeStatsQueryKey() } });
  const { data: resStats } = useGetResumeStats({ query: { queryKey: getGetResumeStatsQueryKey() } });
  const { data: recentSessions = [] } = useListInterviewSessions({ query: { queryKey: getListInterviewSessionsQueryKey() } });

  const totalSessions = (intStats?.totalSessions ?? 0) + (aptStats?.totalTests ?? 0) + (resStats?.totalAnalyses ?? 0);
  const displayName = user?.firstName || user?.email?.split("@")[0] || "there";

  const statValues = [
    intStats?.averageScore ? `${Math.round(intStats.averageScore)}/10` : "—",
    aptStats?.averageScore ? `${Math.round(aptStats.averageScore)}%` : "—",
    resStats?.averageAtsScore ? `${Math.round(resStats.averageAtsScore)}%` : "—",
    intStats?.topCompanies?.[0] ?? aptStats?.topCompanies?.[0] ?? "None yet",
  ];

  return (
    <Layout>
      <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-3 duration-400">

        {/* ══ HERO — always dark, rich gradient ══ */}
        <div className="relative overflow-hidden rounded-3xl" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)" }}>
          {/* Gradient orbs */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-16 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.20) 0%, transparent 70%)" }} />
          <div className="absolute top-6 right-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)" }} />
          {/* Dot grid */}
          <div className="absolute inset-0 dot-grid pointer-events-none" />

          <div className="relative p-7 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="flex-1 space-y-5">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
                  style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.30)", color: "#a5b4fc" }}>
                  <Sparkles className="h-3 w-3" />
                  AI-Powered Placement Prep
                </div>

                {/* Headline */}
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                    {isAuthenticated
                      ? <>Welcome back,<br /><span className="text-gradient">{displayName}!</span></>
                      : <>Land Your<br /><span className="text-gradient">Dream Job.</span></>
                    }
                  </h1>
                  <p className="mt-3 text-sm md:text-base leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {isAuthenticated
                      ? "Your AI interview coach is ready. Pick a tool and keep climbing."
                      : "7 AI tools to prep you for interviews, crack aptitude tests, optimize your profile and more."}
                  </p>
                </div>

                {/* CTA row */}
                <div className="flex flex-wrap gap-3">
                  <Link href="/interview">
                    <button className="btn-primary">
                      <Zap className="h-4 w-4" />
                      Start Interview
                    </button>
                  </Link>
                  <Link href="/question-bank">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.06)" }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                    >
                      Browse Questions <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Stats pills on the right */}
              <div className="flex flex-row lg:flex-col gap-3 flex-wrap">
                {[
                  { icon: Award,    val: totalSessions, label: "Sessions Done" },
                  { icon: Sparkles, val: "7",           label: "AI Tools" },
                  { icon: Zap,      val: "24/7",        label: "Always Available" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <s.icon className="h-4 w-4 shrink-0" style={{ color: "#a5b4fc" }} />
                    <div>
                      <div className="text-lg font-extrabold text-white leading-none">{s.val}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ STATS ROW — colored cards on light bg ══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <div key={i} className="card-clean p-4 md:p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0"
                style={{ background: s.bg }}>
                <s.icon className="h-4.5 w-4.5" style={{ height: 18, width: 18, color: s.color }} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold leading-none" style={{ color: s.color }}>
                {statValues[i]}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ══ ALL TOOLS ══ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">All Tools</h2>
              <p className="text-xs text-muted-foreground mt-0.5">7 AI-powered modules to get you placement-ready</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#ede9fe", color: "#5b21b6", border: "1px solid #ddd6fe" }}>
              <Star className="h-3 w-3" />
              7 modules
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href}>
                  <div className="card-clean p-5 cursor-pointer group relative overflow-hidden">
                    {/* Subtle gradient wash on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${mod.accentLight}60 0%, transparent 100%)` }} />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                          style={{ background: mod.accentLight }}>
                          <Icon className="h-5 w-5" style={{ color: mod.accent }} />
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: mod.accentLight, color: mod.accentText }}>
                          {mod.tag}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground mb-1.5 group-hover:text-[var(--acc)] transition-colors"
                        style={{ "--acc": mod.accent } as React.CSSProperties}>
                        {mod.label}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mod.desc}</p>
                      <div className="flex items-center gap-1 mt-4 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ color: mod.accent }}>
                        Open module <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ══ RECENT ACTIVITY ══ */}
        <div>
          <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: "#6366f1" }} />
            Recent Activity
          </h2>

          <div className="card-clean overflow-hidden">
            {recentSessions.length > 0 ? (
              <div className="divide-y divide-border">
                {recentSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ede9fe" }}>
                        <Hammer className="h-4 w-4" style={{ color: "#6366f1" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm flex items-center gap-2 text-foreground">
                          {session.role}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "#ede9fe", color: "#5b21b6" }}>Interview</span>
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Building className="h-3 w-3" />{session.company}</span>
                          <span className="hidden sm:flex items-center gap-1"><Briefcase className="h-3 w-3" />{session.experience}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-extrabold text-sm" style={{ color: "#6366f1" }}>{session.overallScore}/10</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.createdAt), "MMM d")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#ede9fe" }}>
                    <Activity className="h-8 w-8" style={{ color: "#6366f1" }} />
                  </div>
                </div>
                <p className="font-bold text-foreground text-base">No activity yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Complete a session to see your progress here.</p>
                <Link href="/interview" className="mt-5">
                  <button className="btn-primary">
                    <Hammer className="h-4 w-4" />
                    Start Your First Interview
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
