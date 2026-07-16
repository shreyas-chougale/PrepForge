import { Router, type IRouter } from "express";
import { db, interviewSessionsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech, speechToText, detectAudioFormat } from "@workspace/integrations-openai-ai-server/audio";
import { desc, sql } from "drizzle-orm";
import {
  GenerateInterviewQuestionsBody,
  EvaluateInterviewAnswerBody,
  CreateInterviewSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/interview/generate", async (req, res): Promise<void> => {
  const parsed = GenerateInterviewQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, role, experience, company } = parsed.data;

  const prompt = `You are a senior technical interviewer at ${company}. Generate exactly 5 interview questions for a candidate named ${name} applying for the role of ${role} with ${experience} years of experience. Return ONLY a JSON array of 5 question strings, no other text. Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  let questions: string[] = [];
  try {
    questions = JSON.parse(content);
  } catch {
    const matches = content.match(/"[^"]+\?"/g) ?? [];
    questions = matches.map((q: string) => q.slice(1, -1));
  }

  res.json({
    questions: questions.slice(0, 5),
    sessionContext: { name, role, experience, company },
  });
});

router.post("/interview/evaluate", async (req, res): Promise<void> => {
  const parsed = EvaluateInterviewAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { question, answer, role, company } = parsed.data;

  const prompt = `You are evaluating a job interview answer for a ${role} position at ${company}.
  Question: "${question}"
  Candidate's Answer: "${answer}"
  
  Rate the answer from 0-10 and provide structured feedback. Return ONLY valid JSON in this exact format:
  {
    "score": <number 0-10>,
    "feedback": "<overall feedback in 2-3 sentences>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<area to improve 1>", "<area to improve 2>"]
  }`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let result = { score: 0, feedback: "", strengths: [], improvements: [] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) result = JSON.parse(jsonMatch[0]);
  } catch {
    result.feedback = content;
  }

  res.json(result);
});

router.get("/interview/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(interviewSessionsTable)
    .orderBy(desc(interviewSessionsTable.createdAt));
  res.json(sessions);
});

router.post("/interview/sessions", async (req, res): Promise<void> => {
  const parsed = CreateInterviewSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(interviewSessionsTable)
    .values({
      name: parsed.data.name,
      role: parsed.data.role,
      company: parsed.data.company,
      experience: parsed.data.experience,
      overallScore: parsed.data.overallScore,
      answers: parsed.data.answers as any,
    })
    .returning();

  res.status(201).json(session);
});

router.get("/interview/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(sql`${interviewSessionsTable.id} = ${id}`);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ ...session, answers: session.answers ?? [] });
});

router.get("/interview/stats", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(interviewSessionsTable)
    .orderBy(desc(interviewSessionsTable.createdAt));

  const totalSessions = sessions.length;
  const averageScore =
    totalSessions > 0
      ? sessions.reduce((sum: number, s: any) => sum + s.overallScore, 0) / totalSessions
      : 0;

  const roleCounts: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};
  for (const s of sessions) {
    roleCounts[s.role] = (roleCounts[s.role] ?? 0) + 1;
    companyCounts[s.company] = (companyCounts[s.company] ?? 0) + 1;
  }

  const topRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r);
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const recentImprovement =
    sessions.length >= 2
      ? sessions[0].overallScore - sessions[sessions.length - 1].overallScore
      : 0;

  res.json({ totalSessions, averageScore, topRoles, topCompanies, recentImprovement });
});

router.post("/interview/tts", async (req, res): Promise<void> => {
  const { text, voice } = req.body as { text?: string; voice?: string };
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const audioBuffer = await textToSpeech(text, (voice as any) ?? "alloy", "mp3");
  const base64 = audioBuffer.toString("base64");
  res.json({ audio: base64, format: "mp3" });
});

router.post("/interview/stt", async (req, res): Promise<void> => {
  const { audio } = req.body as { audio?: string };
  if (!audio) {
    res.status(400).json({ error: "audio is required" });
    return;
  }

  const buffer = Buffer.from(audio, "base64");
  const detected = detectAudioFormat(buffer);
  const format = detected === "unknown" ? "webm" : detected; // Default to webm if unknown
  const transcript = await speechToText(buffer, format as any);
  res.json({ transcript });
});

export default router;
