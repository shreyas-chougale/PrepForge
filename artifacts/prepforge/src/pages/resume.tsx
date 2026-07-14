import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeResume, useSaveResumeSession } from "@workspace/api-client-react";
import { ResumeAnalysisResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Initialize PDF.js worker using bundled version to avoid CDN version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function Resume() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);

  const analyzeResume = useAnalyzeResume();
  const saveSession = useSaveResumeSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
    } else {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      
      return fullText;
    } catch (error) {
      console.error("PDF Extraction error:", error);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !role || !company) {
      toast({ title: "Please provide all inputs", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    try {
      const text = await extractTextFromPDF(file);
      setIsExtracting(false);

      const res = await analyzeResume.mutateAsync({
        data: {
          resumeText: text,
          role,
          company
        }
      });
      
      setResult(res);

      await saveSession.mutateAsync({
        data: {
          role,
          company,
          score: res.score,
          atsCompatibility: res.atsCompatibility,
          skills: res.skills,
          suggestions: res.suggestions
        }
      });
      
    } catch (err) {
      setIsExtracting(false);
      toast({ title: "Analysis failed. Please try again.", variant: "destructive" });
    }
  };

  const isPending = isExtracting || analyzeResume.isPending;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {!result ? (
          <Card className="animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="text-center border-b pb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">Resume Analyzer</CardTitle>
              <CardDescription className="text-base max-w-md mx-auto">
                Upload your resume to get instant ATS compatibility scoring and actionable feedback for your target role.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleAnalyze} className="space-y-8 max-w-2xl mx-auto">
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Target Role</Label>
                    <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required placeholder="e.g. Full Stack Developer" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Target Company</Label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="e.g. Microsoft" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resume Document (PDF)</Label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer hover:bg-muted/50 ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf" 
                      className="hidden" 
                    />
                    <UploadCloud className={`h-10 w-10 mx-auto mb-4 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                    {file ? (
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground mt-1">PDF format up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isPending || !file}>
                  {isExtracting ? "Reading PDF..." : analyzeResume.isPending ? "Analyzing..." : "Analyze Resume"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Analysis Results</h2>
              <Button variant="outline" onClick={() => setResult(null)}>
                Analyze Another
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {result.summary}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Overall Score</div>
                    <div className="text-5xl font-bold text-primary">{result.score}</div>
                    <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-muted-foreground mb-4">ATS Compatibility</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{result.atsCompatibility}%</span>
                    </div>
                    <Progress value={result.atsCompatibility} className="h-2" />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground items-start">
                        <ChevronRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Improvement Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground items-start">
                        <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Skill Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Identified Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                {result.missingSkills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Missing Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.missingSkills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm font-medium">
                          {skill}
                        </span>
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
