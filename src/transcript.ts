export type TranscriptTurn = {
  speaker: string;
  startTime?: string;
  endTime?: string;
  text: string;
};

export type ParsedTranscript = {
  turns: TranscriptTurn[];
  speakers: string[];
  rawText: string;
};

const timestampPattern = /^(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/;
const speakerPattern = /^([^:\n]{1,80}):\s*(.+)$/;

function uniqueSpeakers(turns: TranscriptTurn[]) {
  return Array.from(new Set(turns.map((turn) => turn.speaker).filter(Boolean)));
}

function cleanVttText(text: string) {
  return text
    .replace(/^WEBVTT[^\n]*\n?/i, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseSpeakerText(text: string, fallbackSpeaker = 'Unknown speaker') {
  const match = text.trim().match(speakerPattern);

  if (!match) {
    return {
      speaker: fallbackSpeaker,
      text: text.trim(),
    };
  }

  return {
    speaker: match[1].trim(),
    text: match[2].trim(),
  };
}

function parseVttTranscript(rawText: string): ParsedTranscript {
  const cleanedText = cleanVttText(rawText);
  const blocks = cleanedText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const turns: TranscriptTurn[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timestampLineIndex = lines.findIndex((line) => timestampPattern.test(line));

    if (timestampLineIndex === -1) {
      continue;
    }

    const timestampMatch = lines[timestampLineIndex].match(timestampPattern);
    const textLines = lines.slice(timestampLineIndex + 1);

    if (!timestampMatch || textLines.length === 0) {
      continue;
    }

    const speakerText = parseSpeakerText(textLines.join(' '));

    turns.push({
      speaker: speakerText.speaker,
      startTime: timestampMatch[1],
      endTime: timestampMatch[2],
      text: speakerText.text,
    });
  }

  return {
    turns,
    speakers: uniqueSpeakers(turns),
    rawText,
  };
}

function parsePlainTextTranscript(rawText: string): ParsedTranscript {
  const turns: TranscriptTurn[] = [];
  let currentTurn: TranscriptTurn | undefined;

  for (const line of rawText.split('\n')) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const speakerText = parseSpeakerText(trimmedLine);

    if (speakerText.speaker !== 'Unknown speaker') {
      currentTurn = {
        speaker: speakerText.speaker,
        text: speakerText.text,
      };
      turns.push(currentTurn);
      continue;
    }

    if (currentTurn) {
      currentTurn.text = `${currentTurn.text} ${trimmedLine}`;
    } else {
      turns.push({
        speaker: 'Unknown speaker',
        text: trimmedLine,
      });
    }
  }

  return {
    turns,
    speakers: uniqueSpeakers(turns),
    rawText,
  };
}

export function parseTranscript(rawText: string, fileName = ''): ParsedTranscript {
  const isVtt = fileName.toLowerCase().endsWith('.vtt') || rawText.trimStart().toUpperCase().startsWith('WEBVTT');
  const parsedTranscript = isVtt ? parseVttTranscript(rawText) : parsePlainTextTranscript(rawText);

  if (parsedTranscript.turns.length > 0) {
    return parsedTranscript;
  }

  return {
    turns: [
      {
        speaker: 'Unknown speaker',
        text: rawText.trim(),
      },
    ].filter((turn) => turn.text.length > 0),
    speakers: rawText.trim() ? ['Unknown speaker'] : [],
    rawText,
  };
}

export function formatTranscriptForAnalysis(turns: TranscriptTurn[], interviewerSpeaker: string) {
  return turns
    .map((turn) => {
      const speaker = turn.speaker === interviewerSpeaker ? 'Interviewer' : 'Candidate';
      return `${speaker}: ${turn.text}`;
    })
    .join('\n');
}

export function formatTranscriptPreview(turns: TranscriptTurn[]) {
  return turns
    .map((turn) => {
      const timestamp = turn.startTime ? `[${turn.startTime}] ` : '';
      return `${timestamp}${turn.speaker}: ${turn.text}`;
    })
    .join('\n');
}
