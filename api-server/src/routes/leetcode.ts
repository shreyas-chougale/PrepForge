import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/leetcode/assist", async (req, res): Promise<void> => {
  const { problem, language, userCode, assistType } = req.body as {
    problem?: string;
    language?: string;
    userCode?: string;
    assistType?: "hint" | "approach" | "solution" | "complexity" | "review";
  };

  if (!problem) {
    res.status(400).json({ error: "problem is required" });
    return;
  }

  const lang = language ?? "Python";
  const mode = assistType ?? "hint";

  const modeInstructions: Record<string, string> = {
    hint: "Give 2-3 progressive hints that guide the user toward the solution WITHOUT revealing the answer. Focus on what to think about.",
    approach: "Explain the optimal algorithmic approach and data structures to use. Describe the strategy without writing the full code.",
    solution: `Provide the complete, well-commented solution in ${lang} with clear explanation of each step.`,
    complexity: `Analyze the time and space complexity of ${userCode ? "the user's provided code" : "the optimal solution"} with detailed explanation.`,
    review: `Review the user's code for correctness, efficiency, edge cases, and code quality. Provide specific actionable feedback.`,
  };

  const prompt = `You are an expert competitive programmer and coding interview coach. Help with this LeetCode-style problem.

Problem:
---
${problem.slice(0, 3000)}
---

${userCode ? `User's Current Code (${lang}):
\`\`\`${lang}
${userCode.slice(0, 2000)}
\`\`\`` : ""}

Task: ${modeInstructions[mode]}

Return ONLY valid JSON in this exact format:
{
  "assistType": "${mode}",
  "language": "${lang}",
  "mainResponse": "<primary response text>",
  "hints": ["<hint 1>", "<hint 2>"],
  "approach": "<algorithmic approach description>",
  "code": "<code solution if applicable, otherwise empty string>",
  "timeComplexity": "<e.g. O(n log n)>",
  "spaceComplexity": "<e.g. O(n)>",
  "complexity Explanation": "<why these complexities>",
  "relatedConcepts": ["<concept 1>", "<concept 2>"],
  "followUpProblems": ["<related problem name 1>", "<related problem name 2>"]
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
