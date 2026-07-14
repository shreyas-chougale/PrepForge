import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  useGenerateInterviewQuestions,
  useEvaluateInterviewAnswer,
  useCreateInterviewSession,
  useInterviewTextToSpeech,
  useInterviewSpeechToText,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Play, CheckCircle2, RefreshCw, ChevronRight } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

type Step = "config" | "interview" | "summary";

interface AnswerResult {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export default function Interview() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("config");
  
  // Config state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [company, setCompany] = useState("");

  // Interview state
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswerText, setCurrentAnswerText] = useState("");
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<AnswerResult | null>(null);

  // APIs
  const generateQuestions = useGenerateInterviewQuestions();
  const evaluateAnswer = useEvaluateInterviewAnswer();
  const createSession = useCreateInterviewSession();
  const tts = useInterviewTextToSpeech();
  const stt = useInterviewSpeechToText();

  // Audio
  const { isRecording, startRecording, stopRecording, getBase64, audioBlob } = useAudioRecorder();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !experience || !company) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      const res = await generateQuestions.mutateAsync({
        data: { name, role, experience, company }
      });
      setQuestions(res.questions);
      setStep("interview");
      setCurrentQuestionIndex(0);
      playQuestionAudio(res.questions[0]);
    } catch (err) {
      toast({ title: "Failed to generate questions", variant: "destructive" });
    }
  };

  const playQuestionAudio = async (text: string) => {
    if (!text?.trim()) return;
    try {
      setIsPlaying(true);
      const res = await tts.mutateAsync({
        data: { text, voice: "alloy" }
      });
      if (audioRef.current) {
        const mimeType = res.format === "mp3" ? "audio/mpeg" : `audio/${res.format}`;
        audioRef.current.src = `data:${mimeType};base64,${res.audio}`;
        audioRef.current.play().catch((e) => console.error("Audio playback error:", e));
      }
    } catch (err) {
      console.error("TTS error", err);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    if (!isRecording && audioBlob) {
      processAudioAnswer(audioBlob);
    }
  }, [isRecording, audioBlob]);

  const processAudioAnswer = async (blob: Blob) => {
    setIsProcessingAudio(true);
    try {
      const base64 = await getBase64(blob);
      const res = await stt.mutateAsync({
        data: { audio: base64 }
      });
      setCurrentAnswerText((prev) => (prev ? prev + " " + res.transcript : res.transcript));
    } catch (err) {
      toast({ title: "Speech to text failed", variant: "destructive" });
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswerText.trim()) return;

    setIsEvaluating(true);
    try {
      const question = questions[currentQuestionIndex];
      const res = await evaluateAnswer.mutateAsync({
        data: {
          question,
          answer: currentAnswerText,
          role,
          company
        }
      });

      const result: AnswerResult = {
        question,
        answer: currentAnswerText,
        score: res.score,
        feedback: res.feedback,
        strengths: res.strengths,
        improvements: res.improvements,
      };

      setCurrentFeedback(result);
    } catch (err) {
      toast({ title: "Failed to evaluate answer", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentFeedback) return;

    const newAnswers = [...answers, currentFeedback];
    setAnswers(newAnswers);
    setCurrentFeedback(null);
    setCurrentAnswerText("");

    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      playQuestionAudio(questions[nextIdx]);
    } else {
      finishInterview(newAnswers);
    }
  };

  const finishInterview = async (finalAnswers: AnswerResult[]) => {
    const totalScore = finalAnswers.reduce((acc, curr) => acc + curr.score, 0);
    const overallScore = Math.round(totalScore / finalAnswers.length);
    
    try {
      await createSession.mutateAsync({
        data: {
          name,
          role,
          company,
          experience,
          overallScore,
          answers: finalAnswers.map(a => ({
            question: a.question,
            answer: a.answer,
            score: a.score,
            feedback: a.feedback
          }))
        }
      });
      setStep("summary");
    } catch (err) {
      toast({ title: "Failed to save session", variant: "destructive" });
      setStep("summary");
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <audio ref={audioRef} className="hidden" />

        {step === "config" && (
          <Card className="animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-2xl">Configure Mock Interview</CardTitle>
              <CardDescription>Enter details to generate targeted questions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStart} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Target Role</Label>
                    <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required placeholder="Frontend Engineer" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Target Company</Label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Google" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience Level</Label>
                    <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} required placeholder="2 years" />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={generateQuestions.isPending}>
                  {generateQuestions.isPending ? "Generating..." : "Start Interview"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "interview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center text-sm text-muted-foreground font-medium">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">{role} @ {company}</span>
            </div>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex gap-4 items-start mb-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0 rounded-full h-10 w-10"
                    onClick={() => playQuestionAudio(questions[currentQuestionIndex])}
                    disabled={isPlaying || tts.isPending}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl md:text-2xl font-medium leading-snug">
                    {questions[currentQuestionIndex]}
                  </h2>
                </div>

                {!currentFeedback ? (
                  <div className="space-y-4">
                    <Textarea 
                      placeholder="Type your answer or record using the microphone..."
                      value={currentAnswerText}
                      onChange={(e) => setCurrentAnswerText(e.target.value)}
                      className="min-h-[150px] resize-none text-base"
                    />
                    <div className="flex justify-between items-center">
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={handleRecordToggle}
                        className="gap-2"
                        disabled={isProcessingAudio}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? "Stop Recording" : "Record Answer"}
                      </Button>
                      
                      <Button 
                        onClick={handleSubmitAnswer} 
                        disabled={!currentAnswerText.trim() || isEvaluating || isProcessingAudio || isRecording}
                      >
                        {isEvaluating ? "Evaluating..." : "Submit Answer"}
                      </Button>
                    </div>
                    {isProcessingAudio && <p className="text-sm text-muted-foreground animate-pulse">Processing audio...</p>}
                  </div>
                ) : (
                  <div className="space-y-6 bg-muted/50 p-6 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Feedback
                      </h3>
                      <div className="text-2xl font-bold text-primary">{currentFeedback.score}/10</div>
                    </div>
                    
                    <p className="text-muted-foreground">{currentFeedback.feedback}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentFeedback.strengths.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-green-600">Strengths</h4>
                          <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                            {currentFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {currentFeedback.improvements.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-amber-600">Areas for Improvement</h4>
                          <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                            {currentFeedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleNextQuestion} className="gap-2">
                        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === "summary" && (
           <Card className="animate-in fade-in slide-in-from-bottom-4">
           <CardHeader className="text-center pb-2">
             <CardTitle className="text-3xl">Interview Complete</CardTitle>
             <CardDescription>Here is your overall performance summary.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-8 pt-6">
             <div className="flex flex-col items-center justify-center p-8 bg-primary/5 rounded-xl border border-primary/10">
               <span className="text-5xl font-bold text-primary mb-2">
                 {Math.round(answers.reduce((acc, curr) => acc + curr.score, 0) / answers.length)}/10
               </span>
               <span className="text-muted-foreground font-medium uppercase tracking-wider text-sm">Overall Score</span>
             </div>
             
             <div className="space-y-4">
               <h3 className="font-semibold text-lg">Question Breakdown</h3>
               {answers.map((ans, idx) => (
                 <div key={idx} className="p-4 border rounded-lg space-y-2">
                   <div className="flex justify-between items-start gap-4">
                     <p className="font-medium text-sm">{ans.question}</p>
                     <span className="font-bold text-primary shrink-0">{ans.score}/10</span>
                   </div>
                   <p className="text-sm text-muted-foreground line-clamp-2">{ans.feedback}</p>
                 </div>
               ))}
             </div>
           </CardContent>
           <CardFooter className="flex justify-center border-t p-6">
             <Button onClick={() => setStep("config")} variant="outline" className="gap-2">
               <RefreshCw className="h-4 w-4" /> Start New Session
             </Button>
           </CardFooter>
         </Card>
        )}
      </div>
    </Layout>
  );
}
