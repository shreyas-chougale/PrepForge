import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/linkedin/optimize", async (req, res): Promise<void> => {
  const { profileText, targetRole, targetIndustry } = req.body as {
    profileText?: string;
    targetRole?: string;
    targetIndustry?: string;
  };

  if (!profileText || !targetRole) {
    res.status(400).json({ error: "profileText and targetRole are required" });
    return;
  }

  const prompt = `You are a LinkedIn profile optimization expert and career coach. Analyze the following LinkedIn profile for someone targeting a "${targetRole}" role${targetIndustry ? ` in the "${targetIndustry}" industry` : ""}.

Profile:
---
${profileText.slice(0, 6000)}
---

Provide a comprehensive optimization analysis. Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "headline": {
    "current": "<extracted current headline or 'Not provided'>",
    "suggested": "<optimized headline with keywords>",
    "tips": ["<tip 1>", "<tip 2>"]
  },
  "summary": {
    "analysis": "<2-3 sentence analysis of current summary>",
    "suggested": "<rewritten optimized summary (3-4 sentences)>",
    "keywordsToAdd": ["<keyword1>", "<keyword2>", "<keyword3>"]
  },
  "skills": {
    "present": ["<skill1>", "<skill2>"],
    "missing": ["<missing skill1>", "<missing skill2>", "<missing skill3>"],
    "prioritize": ["<high priority skill1>", "<high priority skill2>"]
  },
  "experienceImprovements": ["<improvement tip 1>", "<improvement tip 2>", "<improvement tip 3>"],
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "quickWins": ["<quick win 1>", "<quick win 2>", "<quick win 3>"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
