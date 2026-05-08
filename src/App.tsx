import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Analysis, analyzeTranscript, scoreToPercent } from './analysis';
import { TranscriptTurn, formatTranscriptForAnalysis, formatTranscriptPreview, parseTranscript } from './transcript';

const sampleTranscript = `Interviewer: Thanks for joining. Could you start by walking me through a recent project you led?
Candidate: I led a migration from a legacy reporting service to a React dashboard.
Interviewer: That sounds useful. What was the hardest technical trade-off?
Candidate: The data model was inconsistent, so we had to decide between a quick adapter and a deeper schema cleanup.
Interviewer: Why did you choose the schema cleanup, and how did you measure whether it worked?
Candidate: It reduced duplicate transformations and improved dashboard load time by about 30%.
Interviewer: Nice. What would you do differently next time?
Candidate: I would involve support earlier because they knew the reporting edge cases best.
Interviewer: Helpful context. I’ll leave time at the end for your questions about the role and team.`;

function App() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [transcript, setTranscript] = useState(sampleTranscript);
  const [parsedTurns, setParsedTurns] = useState<TranscriptTurn[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [interviewerSpeaker, setInterviewerSpeaker] = useState('');
  const [candidateSpeaker, setCandidateSpeaker] = useState('');
  const [importMessage, setImportMessage] = useState('Paste a transcript or upload a Teams .vtt/.txt transcript.');
  const [analysis, setAnalysis] = useState<Analysis>(() => analyzeTranscript(sampleTranscript));
  const canAnalyze = useMemo(() => transcript.trim().length > 0, [transcript]);
  const transcriptPreview = useMemo(() => formatTranscriptPreview(parsedTurns), [parsedTurns]);

  function applyParsedTranscript(turns: TranscriptTurn[], detectedSpeakers: string[]) {
    setParsedTurns(turns);
    setSpeakers(detectedSpeakers);

    const nextInterviewerSpeaker = detectedSpeakers[0] ?? '';
    const nextCandidateSpeaker = detectedSpeakers.find((speaker) => speaker !== nextInterviewerSpeaker) ?? '';

    setInterviewerSpeaker(nextInterviewerSpeaker);
    setCandidateSpeaker(nextCandidateSpeaker);
    setTranscript(
      turns.length > 0 && nextInterviewerSpeaker
        ? formatTranscriptForAnalysis(turns, nextInterviewerSpeaker)
        : formatTranscriptPreview(turns),
    );
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isSupportedFile = file.name.toLowerCase().endsWith('.vtt') || file.name.toLowerCase().endsWith('.txt');

    if (!isSupportedFile) {
      setImportMessage('Please upload a .vtt or .txt transcript. Recording upload will come after the transcript flow is stable.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const rawText = String(reader.result ?? '');
      const parsedTranscript = parseTranscript(rawText, file.name);

      applyParsedTranscript(parsedTranscript.turns, parsedTranscript.speakers);
      setImportMessage(
        parsedTranscript.speakers.length > 0
          ? `Imported ${parsedTranscript.turns.length} transcript turns from ${file.name}. Confirm the interviewer before analyzing.`
          : `Imported ${file.name}, but no speaker labels were detected. You can still analyze the raw text.`,
      );
    };

    reader.onerror = () => {
      setImportMessage(`Could not read ${file.name}. Try downloading the transcript again or paste the text manually.`);
    };

    reader.readAsText(file);
  }

  function handleInterviewerChange(nextSpeaker: string) {
    setInterviewerSpeaker(nextSpeaker);

    if (parsedTurns.length > 0) {
      setTranscript(formatTranscriptForAnalysis(parsedTurns, nextSpeaker));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canAnalyze) {
      setAnalysis(analyzeTranscript(transcript));
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Interview feedback coach</p>
          <h1>Turn an interview transcript into feedback you can act on.</h1>
          <p className="hero-copy">
            Upload or paste a Teams transcript, confirm who the interviewer was, then review strengths,
            coaching opportunities, and a scorecard you can compare across interviews.
          </p>
        </div>
        <div className="hero-card" aria-label="Current interviewer score">
          <span>Overall score</span>
          <strong>{analysis.overallScore}/5</strong>
          <p>{scoreToPercent(analysis.overallScore)}% interviewer baseline</p>
        </div>
      </section>

      <section className="workspace">
        <form className="panel input-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2>Transcript source</h2>
              <p>Use the transcript download from Teams first. Recording upload and Gemini transcription can come next.</p>
            </div>
          </div>

          <div className="instruction-card">
            <h3>How to import a Teams transcript</h3>
            <ol>
              <li>Open the meeting in Teams from Calendar, Chat, or Recap.</li>
              <li>Open the Transcript or Recap tab and choose Download.</li>
              <li>Pick .vtt if offered; .txt works if you copy the transcript manually.</li>
              <li>Upload the file here, then select which detected speaker was the interviewer.</li>
            </ol>
            <p>If download is disabled, open the transcript pane, copy all text, and paste it below.</p>
          </div>

          <label htmlFor="transcript-file">Upload Teams transcript file</label>
          <input
            id="transcript-file"
            type="file"
            accept=".vtt,.txt,text/vtt,text/plain"
            onChange={handleFileUpload}
          />
          <p className="hint">{importMessage}</p>

          {speakers.length > 0 && (
            <div className="speaker-grid">
              <label htmlFor="interviewer-speaker">
                Interviewer
                <select
                  id="interviewer-speaker"
                  value={interviewerSpeaker}
                  onChange={(event) => handleInterviewerChange(event.target.value)}
                >
                  {speakers.map((speaker) => (
                    <option key={speaker} value={speaker}>{speaker}</option>
                  ))}
                </select>
              </label>

              <label htmlFor="candidate-speaker">
                Candidate
                <select
                  id="candidate-speaker"
                  value={candidateSpeaker}
                  onChange={(event) => setCandidateSpeaker(event.target.value)}
                >
                  <option value="">Not selected</option>
                  {speakers.map((speaker) => (
                    <option key={speaker} value={speaker}>{speaker}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label htmlFor="meeting-url">Teams meeting link or recording URL</label>
          <input
            id="meeting-url"
            type="url"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
          />
          <p className="hint">
            Optional reference only for now. We are not using Entra or Microsoft Graph in this MVP.
          </p>

          {transcriptPreview && (
            <details className="preview-card">
              <summary>Preview parsed transcript</summary>
              <pre>{transcriptPreview}</pre>
            </details>
          )}

          <label htmlFor="transcript">Transcript</label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              setParsedTurns([]);
              setSpeakers([]);
              setInterviewerSpeaker('');
              setCandidateSpeaker('');
              setImportMessage('Manual transcript edits are ready to analyze.');
            }}
            placeholder="Interviewer: Tell me about a time..."
          />

          <button type="submit" disabled={!canAnalyze}>
            Analyze transcript
          </button>
        </form>

        <section className="panel results-panel" aria-live="polite">
          <div className="panel-header">
            <div>
              <h2>Feedback summary</h2>
              <p>{analysis.summary}</p>
            </div>
          </div>

          <div className="metrics-grid">
            <article>
              <span>Words</span>
              <strong>{analysis.metrics.wordCount}</strong>
            </article>
            <article>
              <span>Questions</span>
              <strong>{analysis.metrics.questionCount}</strong>
            </article>
            <article>
              <span>Follow-ups</span>
              <strong>{analysis.metrics.followUpCount}</strong>
            </article>
            <article>
              <span>Bias risks</span>
              <strong>{analysis.metrics.biasRiskCount}</strong>
            </article>
          </div>

          <div className="scorecard">
            {analysis.scores.map((score) => (
              <article className="score-row" key={score.key}>
                <div className="score-heading">
                  <div>
                    <h3>{score.label}</h3>
                    <p>{score.rationale}</p>
                  </div>
                  <strong>{score.value}/5</strong>
                </div>
                <div className="score-track" aria-label={`${score.label} score ${score.value} out of 5`}>
                  <span style={{ width: `${scoreToPercent(score.value)}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="coaching-grid">
        <article className="panel">
          <h2>What you did well</h2>
          <ul>
            {analysis.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Where to improve</h2>
          <ul>
            {analysis.improvements.map((improvement) => (
              <li key={improvement}>{improvement}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Next interview plan</h2>
          <ol>
            {analysis.nextInterviewPlan.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  );
}

export default App;
