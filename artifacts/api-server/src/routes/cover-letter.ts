import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/cover-letter/generate", async (req, res): Promise<void> => {
  const { jobDescription, resumeText, company, role, applicantName, tone } = req.body as {
    jobDescription?: string;
    resumeText?: string;
    company?: string;
    role?: string;
    applicantName?: string;
    tone?: string;
  };

  if (!jobDescription || !company || !role) {
    res.status(400).json({ error: "jobDescription, company, and role are required" });
    return;
  }

  const selectedTone = tone ?? "professional";

  const prompt = `You are an expert career counselor and professional writer. Generate a compelling cover letter for the following job application.

Applicant Name: ${applicantName ?? "the applicant"}
Target Role: ${role}
Target Company: ${company}
Tone: ${selectedTone}

Job Description:
---
${jobDescription.slice(0, 3000)}
---

${resumeText ? `Applicant's Background (from resume):
---
${resumeText.slice(0, 3000)}
---` : ""}

Generate a tailored, ${selectedTone} cover letter and analysis. Return ONLY valid JSON in this exact format:
{
  "coverLetter": "<full cover letter text with proper paragraphs separated by \\n\\n>",
  "wordCount": <number>,
  "keyStrengths": ["<strength highlighted in letter 1>", "<strength 2>", "<strength 3>"],
  "tailoringPoints": ["<how it was tailored to this role 1>", "<tailoring point 2>"],
  "improvementTips": ["<optional improvement 1>", "<optional improvement 2>"]
}`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let result: any = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) result = JSON.parse(jsonMatch[0]);
  } catch {
    result = { error: "Failed to parse response" };
  }

  res.json(result);
});

export default router;
