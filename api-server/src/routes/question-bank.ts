import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/question-bank/generate", async (req, res): Promise<void> => {
  const { role, company, category, count } = req.body as {
    role?: string;
    company?: string;
    category?: string;
    count?: number;
  };

  if (!role || !category) {
    res.status(400).json({ error: "role and category are required" });
    return;
  }

  const questionCount = Math.min(count ?? 10, 15);

  const prompt = `You are an expert technical interviewer. Generate ${questionCount} interview questions for a "${role}" position${company ? ` at ${company}` : ""} in the category "${category}".

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "id": 1,
    "question": "<question text>",
    "difficulty": "Easy" | "Medium" | "Hard",
    "category": "${category}",
    "tags": ["<tag1>", "<tag2>"],
    "answer": "<comprehensive model answer in 3-5 sentences>",
    "followUp": "<one follow-up question>",
    "tip": "<one tip for answering this well>"
  }
]

Make questions specific to the role${company ? ` and typical ${company} interview style` : ""}. Mix difficulty levels. Ensure answers are thorough and practical.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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

  res.json({ questions, role, company: company ?? "", category });
});

export default router;
