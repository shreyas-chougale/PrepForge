import { useState } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  useGenerateAptitudeTest,
  useSubmitAptitudeTest,
  useSaveAptitudeSession,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { MCQQuestion, UserAnswer, AptitudeTestResult, MCQOption } from "@workspace/api-client-react";

type Step = "config" | "test" | "results";

export default function Aptitude() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("config");
  
  // Config state
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");

  // Test state
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Result state
  const [result, setResult] = useState<AptitudeTestResult | null>(null);

  // APIs
  const generateTest = useGenerateAptitudeTest();
  const submitTest = useSubmitAptitudeTest();
  const saveSession = useSaveAptitudeSession();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !category) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      const res = await generateTest.mutateAsync({
        data: { company, category, count: 5 }
      });
      setQuestions(res.questions);
      setAnswers({});
      setStep("test");
    } catch (err) {
      toast({ title: "Failed to generate test", variant: "destructive" });
    }
  };

  const handleOptionChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast({ title: "Please answer all questions", variant: "destructive" });
      return;
    }

    const userAnswers: UserAnswer[] = Object.entries(answers).map(([qId, val]) => ({
      questionId: parseInt(qId),
      selectedAnswer: val
    }));

    try {
      const res = await submitTest.mutateAsync({
        data: {
          questions,
          userAnswers,
          company,
          category
        }
      });
      setResult(res);
      
      await saveSession.mutateAsync({
        data: {
          company,
          category,
          score: res.score,
          total: res.total,
          percentage: res.percentage
        }
      });
      
      setStep("results");
    } catch (err) {
      toast({ title: "Failed to submit test", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {step === "config" && (
          <Card className="animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-2xl">Aptitude Test</CardTitle>
              <CardDescription>Select a category and target company to begin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStart} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Target Company</Label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="e.g. Amazon, Goldman Sachs" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Data Structures">Data Structures & Algorithms</SelectItem>
                        <SelectItem value="System Design">System Design</SelectItem>
                        <SelectItem value="Quantitative">Quantitative Aptitude</SelectItem>
                        <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                        <SelectItem value="Verbal">Verbal Ability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={generateTest.isPending}>
                  {generateTest.isPending ? "Generating..." : "Start Test"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "test" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-bold">{category} Test</h2>
              <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                {Object.keys(answers).length} / {questions.length} Answered
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardHeader>
                    <CardTitle className="text-lg leading-snug">
                      <span className="text-primary mr-2">{idx + 1}.</span>
                      {q.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={answers[q.id] ?? ""}
                      onValueChange={(val) => handleOptionChange(q.id, val)}
                      className="space-y-3"
                    >
                      {q.options.map((opt: any) => (
                        <div key={opt.label} className="flex items-start space-x-3 space-y-0 p-3 rounded-md border border-transparent hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={opt.label} id={`q${q.id}-opt${opt.label}`} className="mt-1" />
                          <Label htmlFor={`q${q.id}-opt${opt.label}`} className="font-normal cursor-pointer flex-1 leading-relaxed">
                            <span className="font-bold mr-2">{opt.label})</span>{opt.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmit} size="lg" disabled={submitTest.isPending}>
                {submitTest.isPending ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </div>
        )}

        {step === "results" && result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card>
              <CardContent className="p-8 text-center space-y-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-6xl font-bold text-primary">
                    {result.score} <span className="text-3xl text-muted-foreground">/ {result.total}</span>
                  </div>
                  <p className="text-lg font-medium">Score: {result.percentage}%</p>
                </div>
                <p className="text-muted-foreground max-w-lg mx-auto">{result.feedback}</p>
              </CardContent>
            </Card>

            <h3 className="text-xl font-bold pt-4">Detailed Review</h3>
            <div className="space-y-4">
              {result.results.map((ans: any, idx: number) => (
                <Card key={ans.questionId} className={ans.isCorrect ? "border-green-500/20" : "border-destructive/20"}>
                  <CardHeader className="pb-3">
                    <div className="flex gap-2 items-start">
                      {ans.isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                      )}
                      <CardTitle className="text-base leading-snug">{idx + 1}. {ans.question}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 rounded-md bg-muted/50 border">
                        <span className="text-muted-foreground block mb-1">Your Answer</span>
                        <span className="font-medium">{ans.selectedAnswer}</span>
                      </div>
                      <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-900 dark:text-green-300">
                        <span className="opacity-80 block mb-1">Correct Answer</span>
                        <span className="font-medium">{ans.correctAnswer}</span>
                      </div>
                    </div>
                    <div className="text-sm p-4 bg-secondary/30 rounded-md">
                      <span className="font-semibold block mb-1">Explanation</span>
                      {ans.explanation}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center pt-6">
              <Button onClick={() => setStep("config")} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Start New Test
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
