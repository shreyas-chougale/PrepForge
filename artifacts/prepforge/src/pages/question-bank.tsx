import { useState } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Lightbulb, MessageSquare, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  question: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  tags: string[];
  answer: string;
  followUp: string;
  tip: string;
}

const difficultyColor: Record<string, string> = {
  Easy: "text-green-400 bg-green-400/10 border-green-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Hard: "text-red-400 bg-red-400/10 border-red-400/20",
};

const categories = [
  "Behavioral (STAR)", "Technical Fundamentals", "System Design",
  "Data Structures & Algorithms", "Leadership & Teamwork",
  "Problem Solving", "Communication", "Role-Specific Technical",
  "Culture Fit", "Situational Judgment",
];

export default function QuestionBank() {
  const { toast } = useToast();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !category) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setExpanded({});
    try {
      const res = await fetch("/api/question-bank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company, category, count: parseInt(count) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setGenerated(true);
    } catch {
      toast({ title: "Failed to generate questions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    questions.forEach((q) => (all[q.id] = true));
    setExpanded(all);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Interview Question Bank</h1>
            <p className="text-muted-foreground text-sm">Generate targeted questions for any role, company, and category.</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 lg:col-span-1">
                  <Label>Target Role <span className="text-destructive">*</span></Label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Engineer" required />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label>Company <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Amazon" />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label>Count</Label>
                  <Select value={count} onValueChange={setCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto gap-2">
                <Sparkles className="h-4 w-4" />
                {isLoading ? "Generating..." : generated ? "Regenerate Questions" : "Generate Questions"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {questions.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{questions.length} questions · {category} · {role}{company ? ` @ ${company}` : ""}</p>
              <Button variant="outline" size="sm" onClick={expandAll} className="gap-2 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Expand All
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isOpen = !!expanded[q.id];
                return (
                  <Card key={q.id} className={cn("transition-all", isOpen && "border-primary/20")}>
                    <button
                      className="w-full text-left p-4 flex items-start gap-3 group"
                      onClick={() => toggleExpand(q.id)}
                    >
                      <span className="text-primary font-bold text-sm shrink-0 w-6 text-right mt-0.5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium leading-relaxed group-hover:text-primary transition-colors">{q.question}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", difficultyColor[q.difficulty] ?? "text-muted-foreground bg-muted border-border")}>
                              {q.difficulty}
                            </span>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.tags?.map((tag, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <CardContent className="pt-0 pb-4 px-4 ml-9 space-y-4 border-t border-border/50 mt-1">
                        <div className="space-y-1.5 pt-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider">
                            <MessageSquare className="h-3.5 w-3.5" /> Model Answer
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
                        </div>

                        {q.followUp && (
                          <div className="space-y-1.5 p-3 bg-muted/40 rounded-lg border border-border/50">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Follow-up Question</div>
                            <p className="text-sm text-muted-foreground italic">"{q.followUp}"</p>
                          </div>
                        )}

                        {q.tip && (
                          <div className="flex gap-2 items-start">
                            <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{q.tip}</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
