import { Router, type IRouter } from "express";
import { db, resumeSessionsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { desc } from "drizzle-orm";
import {
  AnalyzeResumeBody,
  SaveResumeSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/resume/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, role, company } = parsed.data;

  const prompt = `You are an expert technical recruiter at ${company}. Analyze the following resume for the ${role} position.

Resume:
---
${resumeText.slice(0, 8000)}
---

Provide a comprehensive analysis. Return ONLY valid JSON in this exact format:
{
  "score": <number 0-100, overall resume quality>,
  "atsCompatibility": <number 0-100, ATS compatibility score>,
  "summary": "<2-3 sentence overall assessment>",
  "skills": ["<skill1>", "<skill2>", "<skill3>"],
  "missingSkills": ["<missing skill1>", "<missing skill2>"],
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "suggestions": ["<actionable suggestion1>", "<actionable suggestion2>", "<actionable suggestion3>"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let result = {
    score: 0,
    atsCompatibility: 0,
    summary: "",
    skills: [],
    missingSkills: [],
    strengths: [],
    suggestions: [],
  };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) result = JSON.parse(jsonMatch[0]);
  } catch {
    result.summary = content;
  }

  res.json(result);
});

router.get("/resume/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(resumeSessionsTable)
    .orderBy(desc(resumeSessionsTable.createdAt));
  res.json(sessions);
});

router.post("/resume/sessions", async (req, res): Promise<void> => {
  const parsed = SaveResumeSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(resumeSessionsTable)
    .values({
      role: parsed.data.role,
      company: parsed.data.company,
      score: parsed.data.score,
      atsCompatibility: parsed.data.atsCompatibility,
      skills: parsed.data.skills as any,
      suggestions: parsed.data.suggestions as any,
    })
    .returning();

  res.status(201).json(session);
});

router.get("/resume/stats", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(resumeSessionsTable)
    .orderBy(desc(resumeSessionsTable.createdAt));

  const totalAnalyses = sessions.length;
  const averageScore =
    totalAnalyses > 0
      ? sessions.reduce((sum, s) => sum + s.score, 0) / totalAnalyses
      : 0;
  const averageAtsScore =
    totalAnalyses > 0
      ? sessions.reduce((sum, s) => sum + s.atsCompatibility, 0) / totalAnalyses
      : 0;

  const roleCounts: Record<string, number> = {};
  for (const s of sessions) {
    roleCounts[s.role] = (roleCounts[s.role] ?? 0) + 1;
  }
  const topRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r);

  const improvementTrend =
    sessions.length >= 2
      ? sessions[0].score - sessions[sessions.length - 1].score
      : 0;

  res.json({ totalAnalyses, averageScore, averageAtsScore, topRoles, improvementTrend });
});

export default router;
