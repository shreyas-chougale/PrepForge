import { Router, type IRouter } from "express";
import { db, aptitudeSessionsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  GenerateAptitudeTestBody,
  SubmitAptitudeTestBody,
  SaveAptitudeSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/aptitude/generate", async (req, res): Promise<void> => {
  const parsed = GenerateAptitudeTestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { company, category, count } = parsed.data;
  const questionCount = count ?? 10;

  const prompt = `Generate ${questionCount} multiple-choice aptitude questions for a ${company} placement test in the category "${category}".
Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "id": 1,
    "question": "Question text here",
    "options": [
      { "label": "A", "text": "Option A text" },
      { "label": "B", "text": "Option B text" },
      { "label": "C", "text": "Option C text" },
      { "label": "D", "text": "Option D text" }
    ],
    "correctAnswer": "A",
    "explanation": "Explanation why A is correct"
  }
]
Ensure questions are relevant to ${company} hiring standards for ${category}.`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  let questions: any[] = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
  } catch {
    questions = [];
  }

  res.json({ questions, company, category });
});

router.post("/aptitude/submit", async (req, res): Promise<void> => {
  const parsed = SubmitAptitudeTestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { questions, userAnswers, company, category } = parsed.data;

  const results = questions.map((q: any) => {
    const userAnswer = userAnswers.find((a: any) => a.questionId === q.id);
    const selected = userAnswer?.selectedAnswer ?? "";
    const isCorrect = selected === q.correctAnswer;
    return {
      questionId: q.id,
      question: q.question,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = results.filter((r: any) => r.isCorrect).length;
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  let feedback = "";
  if (percentage >= 80) {
    feedback = `Excellent performance! You scored ${score}/${total} (${percentage}%). You are well-prepared for ${company}'s ${category} section.`;
  } else if (percentage >= 60) {
    feedback = `Good effort! You scored ${score}/${total} (${percentage}%). Review the incorrect answers to strengthen your ${category} skills.`;
  } else {
    feedback = `You scored ${score}/${total} (${percentage}%). Focus on practicing more ${category} problems to improve your performance for ${company}.`;
  }

  res.json({ score, total, percentage, results, feedback });
});

router.get("/aptitude/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(aptitudeSessionsTable)
    .orderBy(desc(aptitudeSessionsTable.createdAt));
  res.json(sessions);
});

router.post("/aptitude/sessions", async (req, res): Promise<void> => {
  const parsed = SaveAptitudeSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(aptitudeSessionsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(session);
});

router.get("/aptitude/stats", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(aptitudeSessionsTable)
    .orderBy(desc(aptitudeSessionsTable.createdAt));

  const totalTests = sessions.length;
  const averageScore =
    totalTests > 0
      ? sessions.reduce((sum, s) => sum + s.percentage, 0) / totalTests
      : 0;

  const categoryCounts: Record<string, { total: number; sum: number }> = {};
  const companyCounts: Record<string, number> = {};
  for (const s of sessions) {
    if (!categoryCounts[s.category]) categoryCounts[s.category] = { total: 0, sum: 0 };
    categoryCounts[s.category].total++;
    categoryCounts[s.category].sum += s.percentage;
    companyCounts[s.company] = (companyCounts[s.company] ?? 0) + 1;
  }

  const bestCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1].sum / b[1].total - a[1].sum / a[1].total)
    .map(([cat]) => cat)[0] ?? "";

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const recentTrend =
    sessions.length >= 2
      ? sessions[0].percentage - sessions[sessions.length - 1].percentage
      : 0;

  res.json({ totalTests, averageScore, bestCategory, topCompanies, recentTrend });
});

export default router;
