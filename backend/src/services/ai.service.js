const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const schemaHint = (type) => {
  if (type === 'multiple_choice') {
    return `Each object must have:
- questionText (string)
- type: "multiple_choice"
- options: array of EXACTLY 4 objects { "label": "A"|"B"|"C"|"D", "text": "...", "isCorrect": true|false } — exactly ONE option must have isCorrect:true
- correctAnswer: the label of the correct option ("A", "B", "C", or "D")
- explanation (string)
- marks: 1`;
  }
  if (type === 'true_false') {
    return `Each object must have:
- questionText (string)
- type: "true_false"
- options: [ { "label":"A","text":"True","isCorrect": true|false }, { "label":"B","text":"False","isCorrect": true|false } ]
- correctAnswer: "A" or "B"
- explanation (string)
- marks: 1`;
  }
  if (type === 'fill_blank' || type === 'short_answer') {
    return `Each object must have:
- questionText (string)
- type: "${type}"
- correctAnswer (string — the expected answer)
- explanation (string)
- marks: 1`;
  }
  // theory / essay
  return `Each object must have:
- questionText (string)
- type: "${type}"
- markingGuide: { modelAnswer (string), keyPoints: [ {point, marks} ], keywords: [string], maxMarks: number, strictness: "lenient"|"moderate"|"strict" }
- explanation (string)
- marks: markingGuide.maxMarks`;
};

const callOpenAI = async (prompt) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(response.choices[0].message.content);
  return Array.isArray(parsed) ? parsed : (parsed.questions || []);
};

/**
 * Generate questions from a topic prompt.
 * Accepts either { type, count } or { types[], quantity }.
 */
exports.generateQuestionsFromPrompt = async (params) => {
  const { subject, topic, classLevel, difficulty = 'medium' } = params;
  const types = params.types?.length ? params.types : [params.type || 'multiple_choice'];
  const total = Number(params.quantity ?? params.count ?? 5);

  // Split the requested quantity across chosen types
  const perType = Math.max(1, Math.floor(total / types.length));
  let remainder = total - perType * types.length;

  const results = [];
  for (const type of types) {
    const n = perType + (remainder-- > 0 ? 1 : 0);
    const prompt = `Generate EXACTLY ${n} ${difficulty} ${type} questions about "${topic}"
for ${subject} at ${classLevel} level for Nigerian secondary school students.

Return ONLY a valid JSON object of the form { "questions": [ ... ] } with exactly ${n} question objects.
${schemaHint(type)}

Do not include any extra text. JSON only.`;
    const batch = await callOpenAI(prompt);
    results.push(...batch.slice(0, n));
  }
  return results;
};

/**
 * Generate questions from uploaded content.
 */
exports.generateQuestionsFromContent = async (params) => {
  const { content, subject, classLevel } = params;
  const types = params.types?.length ? params.types : [params.type || 'multiple_choice'];
  const total = Number(params.quantity ?? params.count ?? 5);

  const perType = Math.max(1, Math.floor(total / types.length));
  let remainder = total - perType * types.length;
  const text = String(content || '').substring(0, 3000);

  const results = [];
  for (const type of types) {
    const n = perType + (remainder-- > 0 ? 1 : 0);
    const prompt = `Based on the following educational content, generate EXACTLY ${n} ${type} questions
suitable for ${subject} at ${classLevel} level.

Content:
"""
${text}
"""

Return ONLY a valid JSON object { "questions": [ ... ] } with exactly ${n} question objects.
${schemaHint(type)}

JSON only, no extra text.`;
    const batch = await callOpenAI(prompt);
    results.push(...batch.slice(0, n));
  }
  return results;
};

/**
 * Mark a theory/essay answer
 */
exports.markTheoryAnswer = async ({ questionText, studentAnswer, markingGuide }) => {
  const prompt = `You are a teacher marking a student's theory answer.

Question: ${questionText}

Model Answer: ${markingGuide?.modelAnswer || ''}

Key Points to award marks:
${markingGuide?.keyPoints?.map((kp, i) => `${i+1}. ${kp.point} [${kp.marks} mark(s)]`).join('\n') || ''}

Keywords to look for: ${markingGuide?.keywords?.join(', ') || ''}
Maximum marks: ${markingGuide?.maxMarks || 1}
Strictness: ${markingGuide?.strictness || 'moderate'}

Student's Answer:
"""
${studentAnswer}
"""

Return ONLY valid JSON:
{
  "marksAwarded": number,
  "confidence": "high" | "medium" | "low",
  "comment": "brief explanation of marks",
  "keyPointsFound": ["..."],
  "keyPointsMissed": ["..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(response.choices[0].message.content);
};

/**
 * Generate AI performance feedback
 */
exports.generateFeedback = async ({ subject, score, percentage, wrongTopics, correctTopics }) => {
  const prompt = `A student scored ${percentage}% (${score}) in ${subject}.
Strong topics: ${correctTopics?.join(', ') || 'none identified'}
Weak topics: ${wrongTopics?.join(', ') || 'none identified'}

Return ONLY valid JSON:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(response.choices[0].message.content);
};
