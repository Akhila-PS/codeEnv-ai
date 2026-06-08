const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function reviewCode(code, language) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a world-class competitive programmer and senior software engineer doing thorough code reviews.

STRICT RULES — follow ALL of these without exception:

1. ALWAYS write the improved code in the SAME programming language as the input code. If input is Java, output must be Java. If input is Python, output must be Python. NEVER switch languages.

2. Always find the mathematically MOST OPTIMAL algorithm:
   - Digit counting → use Math.log10(n) + 1, NOT a loop
   - Searching in sorted array → use binary search, NOT linear scan
   - Finding duplicates → use HashSet, NOT nested loops
   - Sum of range → use prefix sums, NOT repeated addition
   - Power of 2 check → use (n & (n-1)) == 0, NOT loop
   Think deeply. Always use the best known algorithm for the problem.

3. The "current" complexity must reflect what the submitted code actually does.

4. The "optimal" complexity must reflect the best possible algorithm for this problem.

5. If current IS already optimal, say so clearly and still show the cleanest version.

6. DO NOT add exception handling unless:
   - The original code already has it, OR
   - The problem domain genuinely requires it (e.g. user-facing input in a real app, file I/O, network calls)
   - For competitive programming / algorithm problems: do NOT add try-catch, do NOT add input validation, do NOT add error messages. Keep it clean and minimal.

7. DO NOT change the structure of the code unnecessarily. If the original reads from Scanner, keep Scanner. If it uses a while loop for logic, replace it with the optimal algorithm — do not just refactor the same loop.

8. SCORING RULES:
   - Score based on: correctness + algorithm optimality + code cleanliness
   - If the algorithm is suboptimal (e.g. O(log n) loop when O(1) exists), deduct points
   - If the code is clean and correct but not optimal: 60-75
   - If the code uses the optimal algorithm: 80-90
   - If the code is optimal + clean + handles edge cases appropriately: 90-100
   - DO NOT penalize for missing exception handling in algorithm/competitive programming problems

9. Always respond with valid JSON only. No markdown, no extra text outside JSON.

10. CONSISTENCY: Never recommend something in improvedCode that contradicts your score. If you add something to improvedCode, justify it in the issues or improvements.`
      },
      {
        role: 'user',
        content: `Review this ${language} code. The improved code MUST be written in ${language}.

Return ONLY this JSON structure:
{
  "overallScore": <0-100>,
  "summary": "<2-3 sentence summary of the code and its main issues>",
  "complexity": {
    "rating": "<Low|Medium|High|Very High>",
    "current": "<actual complexity of submitted code e.g. O(log n)>",
    "optimal": "<best possible complexity for this problem e.g. O(1)>",
    "explanation": "<explain current approach and how the optimal approach improves it>"
  },
  "issues": [
    {
      "type": "<Bug|Security|Performance|Style|Logic>",
      "severity": "<Critical|High|Medium|Low>",
      "line": "<line number or N/A>",
      "description": "<clear description of the issue>",
      "fix": "<specific actionable fix>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "improvedCode": "<MUST be in ${language}. Use the mathematically most optimal algorithm. Keep the same input/output structure as the original. Do not add unnecessary exception handling for algorithm problems. Proper indentation. Clean variable names. Use \\n for newlines and \\t for tabs>",
  "optimizationExplanation": "<explain exactly what optimal algorithm was used, why it is better, and what the complexity improvement is>",
  "securityScore": <0-100>,
  "maintainabilityScore": <0-100>,
  "performanceScore": <0-100>
}

Code to review (language: ${language}):
\`\`\`${language}
${code}
\`\`\`

IMPORTANT REMINDERS:
- improvedCode MUST be in ${language}
- For digit counting problems: the optimal solution uses Math.log10 in Java/JS or math.log10 in Python
- Do NOT add exception handling to competitive programming solutions
- Do NOT refactor the loop into a cleaner loop — replace it with the truly optimal O(1) or best known algorithm
- Be consistent: what you recommend must match what you score`
      }
    ],
    temperature: 0.1,
    max_tokens: 4000,
  })

  const text = completion.choices[0].message.content.trim()
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

module.exports = { reviewCode }