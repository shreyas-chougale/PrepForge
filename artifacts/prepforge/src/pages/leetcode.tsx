import { useState } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code2, Lightbulb, GitBranch, Terminal, Clock, MemoryStick, BookOpen, RefreshCw } from "lucide-react";

type AssistType = "hint" | "approach" | "solution" | "complexity" | "review";

interface LeetcodeResult {
  assistType: string;
  language: string;
  mainResponse: string;
  hints: string[];
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  complexityExplanation: string;
  relatedConcepts: string[];
  followUpProblems: string[];
}

const assistOptions: { value: AssistType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "hint", label: "Give Me a Hint", icon: Lightbulb, desc: "Progressive hints without spoilers" },
  { value: "approach", label: "Explain Approach", icon: GitBranch, desc: "Algorithm strategy & data structures" },
  { value: "solution", label: "Full Solution", icon: Terminal, desc: "Complete code with explanation" },
  { value: "complexity", label: "Complexity Analysis", icon: Clock, desc: "Time & space complexity breakdown" },
  { value: "review", label: "Review My Code", icon: BookOpen, desc: "Feedback on your solution" },
];

const languages = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C", "Go", "Rust", "Kotlin", "Swift"];

export default function Leetcode() {
  const { toast } = useToast();
  const [problem, setProblem] = useState("");
  const [language, setLanguage] = useState("Python");
  const [userCode, setUserCode] = useState("");
  const [assistType, setAssistType] = useState<AssistType>("hint");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LeetcodeResult | null>(null);

  const handleSubmit = async () => {
    if (!problem.trim()) {
      toast({ title: "Please paste a problem statement", variant: "destructive" });
      return;
    }
    if (assistType === "review" && !userCode.trim()) {
      toast({ title: "Paste your code to get a review", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/leetcode/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, language, userCode: userCode || undefined, assistType }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Request failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = assistOptions.find((o) => o.value === assistType)!;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">LeetCode Interview Assistant</h1>
          </div>
          <p className="text-muted-foreground text-sm">Get hints, approaches, solutions and complexity analysis for any coding problem.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Problem Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Paste the LeetCode problem here...&#10;&#10;e.g. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
                  className="min-h-[180px] resize-none text-sm font-mono"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Code <span className="text-muted-foreground font-normal text-xs">(optional)</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder={`# Your ${language} code here...`}
                  className="min-h-[150px] resize-none text-sm font-mono"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What do you need?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assistOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = assistType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAssistType(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isLoading}>
              <selectedOption.icon className="h-4 w-4 mr-2" />
              {isLoading ? "Thinking..." : selectedOption.label}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Response</h3>
              <Button variant="outline" size="sm" onClick={() => setResult(null)} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> New Request
              </Button>
            </div>

            <Card>
              <CardContent className="p-6 space-y-5">
                <p className="text-sm leading-relaxed text-foreground/90">{result.mainResponse}</p>

                {result.hints?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hints</Label>
                    <ol className="space-y-2">
                      {result.hints.map((h, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                          <span className="text-muted-foreground">{h}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {result.approach && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Approach</Label>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.approach}</p>
                  </div>
                )}

                {result.code && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Code ({result.language})</Label>
                    <pre className="bg-muted/60 border rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                      {result.code}
                    </pre>
                  </div>
                )}

                {(result.timeComplexity || result.spaceComplexity) && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Time Complexity</div>
                        <div className="font-mono font-bold text-sm">{result.timeComplexity}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <MemoryStick className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Space Complexity</div>
                        <div className="font-mono font-bold text-sm">{result.spaceComplexity}</div>
                      </div>
                    </div>
                  </div>
                )}

                {result.relatedConcepts?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Related Concepts</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {result.relatedConcepts.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.followUpProblems?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Practice Next</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {result.followUpProblems.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
