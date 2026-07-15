import { useState } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Sparkles, Copy, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";

interface CoverLetterResult {
  coverLetter: string;
  wordCount: number;
  keyStrengths: string[];
  tailoringPoints: string[];
  improvementTips: string[];
}

export default function CoverLetter() {
  const { toast } = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [tone, setTone] = useState("professional");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || !company.trim() || !role.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resumeText, company, role, applicantName, tone }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Generation failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.coverLetter) return;
    await navigator.clipboard.writeText(result.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {!result ? (
          <Card>
            <CardHeader className="text-center border-b pb-6">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">Cover Letter Generator</CardTitle>
              <CardDescription>Generate a tailored, compelling cover letter in seconds.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Your Name</Label>
                    <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Company <span className="text-destructive">*</span></Label>
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Role <span className="text-destructive">*</span></Label>
                    <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Job Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    className="min-h-[140px] resize-none text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Resume / Background <span className="text-muted-foreground text-xs">(optional but recommended)</span></Label>
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume or key background points to make the letter more personalized..."
                    className="min-h-[120px] resize-none text-sm"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isLoading ? "Generating Letter..." : "Generate Cover Letter"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold">Your Cover Letter</h2>
                <p className="text-sm text-muted-foreground">{result.wordCount} words · {tone} tone</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setResult(null)} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Regenerate
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-[Georgia,serif]">
                  {result.coverLetter}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Key Strengths Highlighted</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.keyStrengths?.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Tailored To Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.tailoringPoints?.map((p, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{p}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Optional Improvements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.improvementTips?.map((t, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                      <ChevronRight className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{t}</span>
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
