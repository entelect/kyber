import { FormEvent, useMemo, useState } from 'react';
import { Analysis, analyzeTranscript, scoreToPercent } from './analysis';

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
  const [analysis, setAnalysis] = useState<Analysis>(() => analyzeTranscript(sampleTranscript));
  const canAnalyze = useMemo(() => transcript.trim().length > 0, [transcript]);

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
            Paste a Teams transcript for now, then review interviewer strengths, coaching opportunities,
            and a scorecard you can compare across interviews.
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
              <p>Teams API access can be added later with Microsoft Graph auth. The basic flow starts with pasted text.</p>
            </div>
          </div>

          <label htmlFor="meeting-url">Teams meeting link or recording URL</label>
          <input
            id="meeting-url"
            type="url"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
          />
          <p className="hint">
            Stored locally in this page state only. Transcript import is not connected yet.
          </p>

          <label htmlFor="transcript">Transcript</label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
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
