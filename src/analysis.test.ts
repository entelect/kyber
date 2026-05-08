import { strict as assert } from 'node:assert';
import { analyzeTranscript } from './analysis';
import { formatTranscriptForAnalysis, parseTranscript } from './transcript';

const strongTranscript = `Interviewer: Thanks for joining. I’ll start with the role and agenda, then leave time for your questions.
Candidate: Sounds good.
Interviewer: Could you walk me through a project you led?
Candidate: I led a migration.
Interviewer: Why did you choose that approach?
Candidate: It reduced risk.
Interviewer: How did you measure success?
Candidate: Load time improved 30%.
Interviewer: Helpful. What trade-off did you make?`;

const riskyTranscript = `Interviewer: Are you married and do you have kids?
Candidate: I would rather focus on the role.
Interviewer: What is your native language?`;

const strongAnalysis = analyzeTranscript(strongTranscript);
const riskyAnalysis = analyzeTranscript(riskyTranscript);
const riskyFairnessScore = riskyAnalysis.scores.find((score) => score.key === 'fairness');
const teamsVttTranscript = `WEBVTT

00:00:01.000 --> 00:00:04.000
Alex Interviewer: Thanks for joining. Could you walk me through a recent project?

00:00:04.500 --> 00:00:07.000
Priya Candidate: I led a migration.

00:00:07.500 --> 00:00:11.000
Alex Interviewer: Why did you choose that approach?`;
const parsedTeamsTranscript = parseTranscript(teamsVttTranscript, 'teams-transcript.vtt');
const normalizedTeamsTranscript = formatTranscriptForAnalysis(parsedTeamsTranscript.turns, 'Alex Interviewer');

assert.equal(strongAnalysis.scores.length, 5);
assert.ok(strongAnalysis.overallScore >= 4, `expected strong transcript score >= 4, received ${strongAnalysis.overallScore}`);
assert.ok(strongAnalysis.metrics.followUpCount >= 3);
assert.ok(riskyAnalysis.metrics.biasRiskCount >= 3);
assert.ok(riskyFairnessScore);
assert.ok(riskyFairnessScore.value < 3, 'expected risky transcript to reduce fairness score');
assert.deepEqual(parsedTeamsTranscript.speakers, ['Alex Interviewer', 'Priya Candidate']);
assert.equal(parsedTeamsTranscript.turns.length, 3);
assert.ok(normalizedTeamsTranscript.includes('Interviewer: Thanks for joining.'));
assert.ok(normalizedTeamsTranscript.includes('Candidate: I led a migration.'));

console.log('analysis tests passed');
