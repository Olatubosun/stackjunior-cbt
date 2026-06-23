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
 * Extract questions from a photographed/scanned question paper using vision.
 * Accepts a base64-encoded image (JPEG/PNG).
 */
exports.scanPaperImage = async ({ imageBase64, mimeType = 'image/jpeg', subject, classLevel }) => {
  if (!imageBase64) throw new Error('imageBase64 is required');

  const prompt = `You are looking at a photo or scan of a printed question paper.
Extract EVERY question visible in the image. For each, infer its type from the layout:
- If options A/B/C/D are listed -> "multiple_choice"
- If it's True/False -> "true_false"
- If there's a blank to fill -> "fill_blank"
- If it asks for a short answer -> "short_answer"
- Otherwise -> "theory"

${subject ? `The subject is: ${subject}.` : ''}
${classLevel ? `The class level is: ${classLevel}.` : ''}

Return ONLY valid JSON of the form { "questions": [ ... ] } where each question is:
- For multiple_choice:
  { questionText, type:"multiple_choice",
    options:[{label:"A",text:"...",isCorrect:bool},{label:"B",...},{label:"C",...},{label:"D",...}],
    correctAnswer: "A"|"B"|"C"|"D" (best guess if not visible; null if truly unknown),
    explanation, marks: 1 }
- For true_false:
  { questionText, type:"true_false",
    options:[{label:"A",text:"True",isCorrect:bool},{label:"B",text:"False",isCorrect:bool}],
    correctAnswer:"A"|"B", explanation, marks:1 }
- For fill_blank / short_answer:
  { questionText, type:"...", correctAnswer:"...", explanation, marks:1 }
- For theory:
  { questionText, type:"theory",
    markingGuide:{ modelAnswer, keyPoints:[{point,marks}], keywords:[], maxMarks:5, strictness:"moderate" },
    explanation, marks: 5 }

Faithfully transcribe the text. If part of the image is unreadable, do your best to fill in
plausible content and lower the marks. JSON only, no commentary.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ]
    }],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  return questions.map(q => ({ ...q, source: 'scanned' }));
};

/**
 * Generate practice questions modeled on a specific external examination
 * (WAEC, NECO, NABTEB, JAMB, BECE, NCEE, etc.) for a given subject, year and level.
 *
 * Questions are AI-generated in the style of that exam — not verbatim past papers.
 */
exports.generateExternalExamQuestions = async (params) => {
  const { examBody, year, subject, classLevel } = params;
  const types = params.types?.length ? params.types : [params.type || 'multiple_choice'];
  const total = Number(params.quantity ?? params.count ?? 10);

  if (!examBody) throw new Error('examBody is required');
  if (!subject)  throw new Error('subject is required');

  const perType = Math.max(1, Math.floor(total / types.length));
  let remainder = total - perType * types.length;

  const results = [];
  for (const type of types) {
    const n = perType + (remainder-- > 0 ? 1 : 0);
    const prompt = `You are an expert Nigerian curriculum and examinations developer.
Generate EXACTLY ${n} ${type} practice questions for ${examBody}${year ? ` ${year}` : ''} ${subject}${classLevel ? ` (${classLevel})` : ''}.

CRITICAL — Syllabus accuracy:
- Use the OFFICIAL ${examBody} syllabus for ${subject} that was IN FORCE in ${year || 'the most recent cycle'}.
  For JAMB UTME, use the JAMB Brochure / e-syllabus for that exam year.
  For WAEC / NECO SSCE, use the WAEC or NECO senior secondary syllabus active in that cycle.
  For NABTEB SSCE/NBC/NTC, use the NABTEB syllabus for that year.
  For BECE, JSCE, NCEE and Common Entrance, use the Basic Education / Junior Secondary Curriculum
  that was in force at that time.
- Cover the actual topics, sub-topics and learning objectives the syllabus prescribes for ${subject}.
- Respect the topic-weighting and difficulty distribution typical of ${examBody} ${subject} papers
  (e.g. JAMB Mathematics emphasises Algebra, Geometry, Calculus and Statistics in known proportions;
   WAEC Biology stresses Cell Biology, Genetics, Ecology and Physiology, etc.).
- If the syllabus changed in or before ${year || 'the chosen year'} (for example, JAMB introduced a new
  syllabus in 2022 and another revision in 2025), reflect THAT version, not an older or newer one.
- Use Nigerian English spelling, local names, naira-denominated examples, and Nigerian geography /
  history / civics references where natural to the subject.

Style requirements:
- Match the phrasing conventions, length and structure typical of ${examBody} ${subject} papers.
- Difficulty must be calibrated to ${classLevel || 'the appropriate level for this exam'}.
- These are ORIGINAL practice questions in the style of the exam — do NOT reproduce
  verbatim copyrighted past-paper text.

Return ONLY a valid JSON object of the form { "questions": [ ... ] } with exactly ${n} question objects.
${schemaHint(type)}

JSON only. No extra text.`;
    const batch = await callOpenAI(prompt);
    results.push(
      ...batch.slice(0, n).map(q => ({
        ...q,
        source:       'external_exam',
        externalExam: `${examBody}${year ? ' ' + year : ''}`,
      }))
    );
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
