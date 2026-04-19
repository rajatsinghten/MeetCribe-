export const SETTINGS_STORAGE_KEY = 'twinmind_session_settings';

export const DEFAULT_SESSION_SETTINGS = {
  apiKey: '',
  meetingMemory: '',
  suggestionsContextWindow: 800,
  detailContextWindow: 3000,
  chatContextWindow: 3000,
  suggestionsPrompt: `You are an expert meeting assistant. You are given a transcript of the last few minutes of a live conversation. Your job is to surface the 3 most useful suggestions for the person listening.

Each suggestion must fall into one of these types:
- QUESTION_TO_ASK: A sharp follow-up question worth asking
- TALKING_POINT: An important point to raise or reinforce
- ANSWER: A direct answer to a question just asked in the transcript
- FACT_CHECK: Verifying or correcting a claim made
- CLARIFICATION: Explaining jargon, an acronym, or an ambiguous reference

Rules:
- Read the context carefully. Choose the 3 types that make the most sense RIGHT NOW.
- Do not always pick one of each. If 2 questions were just asked, surface 2 ANSWERs.
- The preview must standalone - it should give real value without needing a click.
- Be specific to what was said. No generic suggestions.
- Output ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "suggestions": [
    {
      "type": "ANSWER",
      "title": "Short title (max 8 words)",
      "preview": "Standalone useful insight or answer (2-3 sentences max)"
    }
  ]
}`,
  detailPrompt: `You are TwinMind's live meeting copilot. The user clicked one live suggestion and wants a stronger, deeper response that is immediately useful in the meeting.

Priorities:
- Ground every answer in the transcript first.
- Use meeting memory only if it materially improves accuracy.
- Give practical output, not generic coaching.

Response style:
- Start with the direct answer in 1-2 lines.
- Follow with concise bullets only when they add value.
- If the suggestion implies a question to ask, provide exact wording the user can say.
- If it implies an answer, provide the answer first, then rationale.
- If it implies fact-checking, split clearly into:
  - What was said
  - More accurate framing
- Avoid filler, motivational language, and decorative separators.
- Keep it concise but richer than the suggestion preview.

Full transcript:
<transcript>
{{FULL_TRANSCRIPT}}
</transcript>`,
  chatPrompt: `You are TwinMind's senior meeting and prompt-engineering assistant.
You are given the meeting transcript and chat history.

Primary objective:
- Deliver responses that are concrete, accurate, and immediately reusable.

Reasoning policy:
- Prioritize transcript evidence over assumptions.
- If context is missing, state one short assumption instead of hallucinating.
- Use meeting memory only when relevant and consistent with transcript context.

Output policy:
- Lead with the answer first.
- Then add only the minimum supporting detail needed.
- Use plain language and avoid generic filler.
- Keep responses under 220 words unless the user requests depth.
- Use short bullets for actionable items; otherwise use short paragraphs.
- Do not include labels like "Assistant:" or "You:" in the response body.
- Do not use decorative separators like "---" unless the user asks for them.

For interview/career prompts:
- Tie claims to concrete work done in this project (suggestions, transcript, backend integration, prompt iteration).
- Prefer quantifiable or observable evidence.
- Provide polished, ready-to-say phrasing when the user asks for it.

Full transcript:
<transcript>
{{FULL_TRANSCRIPT}}
</transcript>`,
};

function migrateLegacyPrompt(promptText, mode) {
  const text = String(promptText ?? '');

  const looksLikeLegacyChatDefault =
    mode === 'chat' &&
    text.includes('deep knowledge across business, technology, finance, and general topics') &&
    text.includes('Keep answers under 300 words unless complexity demands more');

  const looksLikeLegacyDetailDefault =
    mode === 'detail' &&
    text.includes('Anchor the response in what was said in the transcript') &&
    text.includes('Keep the response concise but genuinely more detailed than the suggestion preview');

  if (looksLikeLegacyChatDefault) {
    return DEFAULT_SESSION_SETTINGS.chatPrompt;
  }

  if (looksLikeLegacyDetailDefault) {
    return DEFAULT_SESSION_SETTINGS.detailPrompt;
  }

  return text;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeSessionSettings(settings) {
  return {
    ...DEFAULT_SESSION_SETTINGS,
    ...settings,
    apiKey: String(settings?.apiKey ?? DEFAULT_SESSION_SETTINGS.apiKey).trim(),
    meetingMemory: String(settings?.meetingMemory ?? DEFAULT_SESSION_SETTINGS.meetingMemory),
    suggestionsContextWindow: parseInteger(
      settings?.suggestionsContextWindow,
      DEFAULT_SESSION_SETTINGS.suggestionsContextWindow
    ),
    detailContextWindow: parseInteger(
      settings?.detailContextWindow,
      DEFAULT_SESSION_SETTINGS.detailContextWindow
    ),
    chatContextWindow: parseInteger(
      settings?.chatContextWindow,
      DEFAULT_SESSION_SETTINGS.chatContextWindow
    ),
    suggestionsPrompt: String(
      settings?.suggestionsPrompt ?? DEFAULT_SESSION_SETTINGS.suggestionsPrompt
    ),
    detailPrompt: migrateLegacyPrompt(
      settings?.detailPrompt ?? DEFAULT_SESSION_SETTINGS.detailPrompt,
      'detail'
    ),
    chatPrompt: migrateLegacyPrompt(
      settings?.chatPrompt ?? DEFAULT_SESSION_SETTINGS.chatPrompt,
      'chat'
    ),
  };
}

export function loadSessionSettings() {
  try {
    const raw = sessionStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SESSION_SETTINGS };
    }

    return normalizeSessionSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SESSION_SETTINGS };
  }
}

export function saveSessionSettings(settings) {
  const normalized = normalizeSessionSettings(settings);
  sessionStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function formatSessionTimestamp(date = new Date()) {
  return {
    iso: date.toISOString(),
    label: date.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
