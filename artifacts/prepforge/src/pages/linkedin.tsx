import { useState } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Linkedin, Sparkles, CheckCircle2, AlertTriangle, Zap, ChevronRight, RotateCcw } from "lucide-react";

interface LinkedInResult {
  overallScore: number;
  headline: { current: string; suggested: string; tips: string[] };
  summary: { analysis: string; suggested: string; keywordsToAdd: string[] };
  skills: { present: string[]; missing: string[]; prioritize: string[] };
  experienceImprovements: string[];
  keyInsights: string[];
  quickWins: string[];
}

export default function LinkedIn() {
  const { toast } = useToast();
  const [profileText, setProfileText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LinkedInResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileText.trim() || !targetRole.trim()) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/linkedin/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText, targetRole, targetIndustry }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Analysis failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 75 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {!result ? (
          <Card>
            <CardHeader className="text-center border-b pb-6">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Linkedin className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">LinkedIn Profile Optimizer</CardTitle>
              <CardDescription>
                Paste your LinkedIn profile content and get AI-powered suggestions to stand out.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Target Role <span className="text-destructive">*</span></Label>
                    <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior Software Engineer" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Industry</Label>
                    <Input value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} placeholder="e.g. FinTech, Healthcare" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Your LinkedIn Profile Content <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder="Paste your LinkedIn headline, summary, experience, skills, and any other sections here..."
                    className="min-h-[220px] resize-none text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Copy & paste from your LinkedIn profile — headline, about section, experience descriptions, skills list.</p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isLoading ? "Analyzing Profile..." : "Optimize Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Optimization Report</h2>
              <Button variant="outline" size="sm" onClick={() => setResult(null)} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Analyze Again
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="sm:col-span-1">
                <CardContent className="p-6 text-center">
                  <div className={`text-5xl font-bold mb-1 ${scoreColor(result.overallScore)}`}>
                    {result.overallScore}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Profile Score</div>
                  <Progress value={result.overallScore} className="h-2" />
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> Quick Wins</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.quickWins?.map((w, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{w}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Headline Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current</div>
                    <p className="text-sm bg-muted/50 p-2 rounded">{result.headline?.current}</p>
                  </div>
                  <div>
                    <div className="text-xs text-primary uppercase tracking-wider mb-1 font-semibold">Suggested</div>
                    <p className="text-sm bg-primary/10 border border-primary/20 p-2 rounded font-medium">{result.headline?.suggested}</p>
                  </div>
                  {result.headline?.tips?.map((tip, i) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground items-start">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />{tip}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Skills Gap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Add These Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.skills?.missing?.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Prioritize These</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.skills?.prioritize?.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary Rewrite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Analysis</div>
                  <p className="text-sm text-muted-foreground">{result.summary?.analysis}</p>
                </div>
                <div>
                  <div className="text-xs text-primary uppercase tracking-wider mb-1 font-semibold">Suggested Summary</div>
                  <p className="text-sm bg-primary/5 border border-primary/10 p-3 rounded leading-relaxed">{result.summary?.suggested}</p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Keywords to Add</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.summary?.keywordsToAdd?.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs">{k}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-400" /> Experience Improvements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.experienceImprovements?.map((tip, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <ChevronRight className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400" /> Key Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.keyInsights?.map((insight, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <ChevronRight className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{insight}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
