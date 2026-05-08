export type ScoreKey = 'structure' | 'listening' | 'probing' | 'fairness' | 'candidateExperience';

export type Score = {
  key: ScoreKey;
  label: string;
  value: number;
  rationale: string;
};

export type Analysis = {
  overallScore: number;
  summary: string;
  scores: Score[];
  strengths: string[];
  improvements: string[];
  nextInterviewPlan: string[];
  metrics: {
    wordCount: number;
    questionCount: number;
    followUpCount: number;
    positiveSignalCount: number;
    biasRiskCount: number;
  };
};

const scoreLabels: Record<ScoreKey, string> = {
  structure: 'Interview structure',
  listening: 'Active listening',
  probing: 'Depth of probing',
  fairness: 'Fairness and consistency',
  candidateExperience: 'Candidate experience',
};

const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'could', 'can', 'would', 'tell me'];
const followUpPhrases = ['why', 'how did', 'what happened', 'what would', 'tell me more', 'walk me through', 'measure', 'trade-off'];
const positivePhrases = ['thanks', 'helpful', 'nice', 'great', 'useful', 'good', 'appreciate'];
const structurePhrases = ['start', 'agenda', 'time', 'end', 'questions', 'next steps', 'role', 'team'];
const fairnessPhrases = ['same question', 'rubric', 'criteria', 'score', 'evidence', 'examples'];
const riskPhrases = ['age', 'married', 'kids', 'children', 'pregnant', 'religion', 'politics', 'native language'];

function countMatches(text: string, phrases: string[]) {
  const lowerText = text.toLowerCase();

  return phrases.reduce((count, phrase) => {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lowerText.match(new RegExp(`\\b${escapedPhrase}\\b`, 'g'));

    return count + (matches?.length ?? 0);
  }, 0);
}

function clampScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(score)));
}

export function scoreToPercent(score: number) {
  return Math.round((score / 5) * 100);
}

export function analyzeTranscript(transcript: string): Analysis {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const interviewerLines = transcript
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith('interviewer:'));
  const interviewerText = interviewerLines.join(' ') || transcript;
  const questionCount = (interviewerText.match(/\?/g) ?? []).length + countMatches(interviewerText, questionWords);
  const followUpCount = countMatches(interviewerText, followUpPhrases);
  const positiveSignalCount = countMatches(interviewerText, positivePhrases);
  const structureSignalCount = countMatches(interviewerText, structurePhrases);
  const fairnessSignalCount = countMatches(interviewerText, fairnessPhrases);
  const biasRiskCount = countMatches(interviewerText, riskPhrases);

  const scores: Score[] = [
    {
      key: 'structure',
      label: scoreLabels.structure,
      value: clampScore(2 + structureSignalCount),
      rationale: structureSignalCount > 1
        ? 'You set context and protected space for candidate questions.'
        : 'Add a clearer agenda, timing, and next-step framing.',
    },
    {
      key: 'listening',
      label: scoreLabels.listening,
      value: clampScore(2 + positiveSignalCount + Math.min(followUpCount, 2)),
      rationale: positiveSignalCount > 0
        ? 'You acknowledged candidate answers and used signals that keep the conversation warm.'
        : 'Use brief acknowledgements before moving to the next question.',
    },
    {
      key: 'probing',
      label: scoreLabels.probing,
      value: clampScore(1 + followUpCount),
      rationale: followUpCount >= 3
        ? 'You asked follow-ups that uncovered decision-making, trade-offs, and outcomes.'
        : 'Ask more evidence-based follow-ups about impact, constraints, and alternatives.',
    },
    {
      key: 'fairness',
      label: scoreLabels.fairness,
      value: clampScore(3 + fairnessSignalCount - biasRiskCount),
      rationale: biasRiskCount === 0
        ? 'No obvious personal or protected-characteristic questions were detected.'
        : 'Potential bias-risk topics appeared; keep questions job-related and evidence-based.',
    },
    {
      key: 'candidateExperience',
      label: scoreLabels.candidateExperience,
      value: clampScore(2 + positiveSignalCount + Math.min(structureSignalCount, 2)),
      rationale: positiveSignalCount > 0 && structureSignalCount > 0
        ? 'The conversation includes rapport signals and candidate-facing context.'
        : 'Improve warmth by explaining the flow and leaving time for candidate questions.',
    },
  ];

  const overallScore = Math.round((scores.reduce((total, score) => total + score.value, 0) / scores.length) * 10) / 10;
  const strengths = [
    followUpCount >= 2
      ? 'You used follow-up questions to dig beyond surface-level answers.'
      : 'You captured enough signal to identify where follow-ups would add depth.',
    positiveSignalCount > 0
      ? 'You gave positive conversational cues that can help candidates feel heard.'
      : 'The transcript is direct and concise, which can keep the interview focused.',
    biasRiskCount === 0
      ? 'The detected questions stayed away from obvious protected-characteristic topics.'
      : 'You have specific places to tighten fairness by removing personal-topic questions.',
  ];
  const improvements = [
    questionCount < 6
      ? 'Add more structured, job-relevant questions so the score is based on repeated evidence.'
      : 'Group questions into competencies so evidence maps cleanly to the role rubric.',
    followUpCount < 3
      ? 'After strong claims, ask “what was your role?”, “how did you measure it?”, and “what trade-off did you make?”.'
      : 'Capture candidate answers against a consistent rubric while the detail is fresh.',
    structureSignalCount < 2
      ? 'Open with the interview plan and close with next steps plus time for candidate questions.'
      : 'Make the structure reusable as a checklist for every candidate.',
  ];

  return {
    overallScore,
    summary: `This transcript scores ${overallScore}/5 as an interviewer performance baseline. The strongest signals are ${followUpCount >= 2 ? 'probing and listening' : 'focus and clarity'}, with the biggest opportunity in ${structureSignalCount < 2 ? 'consistent interview structure' : 'rubric-based scoring'}.`,
    scores,
    strengths,
    improvements,
    nextInterviewPlan: [
      'Start with a 30-second agenda and what competencies you are assessing.',
      'Ask one primary question per competency, then two evidence-based follow-ups.',
      'Write down evidence, not impressions, before assigning a score.',
      'Close with candidate questions and the next step in the process.',
    ],
    metrics: {
      wordCount: words.length,
      questionCount,
      followUpCount,
      positiveSignalCount,
      biasRiskCount,
    },
  };
}
