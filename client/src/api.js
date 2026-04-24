const RAW_API_BASE = (import.meta.env.VITE_API_BASE || '/api').trim();
const API_BASE = RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;
const SETTINGS_STORAGE_KEY = 'twinmind_session_settings';

function getAudioExtensionFromMimeType(mimeType) {
  const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();

  if (normalized === 'audio/webm') {
    return 'webm';
  }

  if (normalized === 'audio/mp4' || normalized === 'audio/x-m4a') {
    return 'm4a';
  }

  if (normalized === 'audio/wav' || normalized === 'audio/x-wav') {
    return 'wav';
  }

  if (normalized === 'audio/mpeg') {
    return 'mp3';
  }

  if (normalized === 'audio/ogg') {
    return 'ogg';
  }

  return 'webm';
}

function getGroqApiKey() {
  try {
    const stored = sessionStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return '';
    }

    return JSON.parse(stored)?.apiKey || '';
  } catch {
    return '';
  }
}

function buildHeaders(includeContentType = true) {
  const headers = {
    'X-Groq-API-Key': getGroqApiKey(),
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export async function transcribeAudioBlob(audioBlob) {
  const formData = new FormData();
  const extension = getAudioExtensionFromMimeType(audioBlob?.type);
  formData.append('audio_file', audioBlob, `meeting-audio.${extension}`);

  const response = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: buildHeaders(false),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status})`);
  }

  return response.json();
}

export async function fetchSuggestions(payload) {
  const response = await fetch(`${API_BASE}/suggestions`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Suggestions failed (${response.status})`);
  }

  return response.json();
}

export async function startMeeting(payload) {
  const response = await fetch(`${API_BASE}/meeting/start`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Meeting start failed (${response.status})`);
  }

  return response.json();
}

export async function endMeeting(payload) {
  const response = await fetch(`${API_BASE}/meeting/end`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Meeting end failed (${response.status})`);
  }

  return response.json();
}

export async function streamChat(payload, onToken) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Chat failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Streaming response body is missing.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      if (!chunk.startsWith('data: ')) {
        continue;
      }

      const payloadText = chunk.slice(6);
      if (payloadText === '[DONE]') {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(payloadText);
      } catch {
        continue;
      }

      const token = parsed.choices?.[0]?.delta?.content;
      if (token) {
        onToken(token);
      }
    }
  }
}

export function exportSessionAsJson(session) {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `twinmind-session-${new Date().toISOString().replaceAll(':', '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
