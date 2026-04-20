import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SuggestionCard from './SuggestionCard';
import { fetchSuggestions } from '../api';

const ReloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="M5.64 5.64l2.83 2.83" />
    <path d="M15.53 15.53l2.83 2.83" />
    <path d="M18.36 5.64l-2.83 2.83" />
    <path d="M8.47 15.53l-2.83 2.83" />
  </svg>
);

export default function LiveSuggestionsPanel({
  transcriptText,
  spokenTranscriptText,
  hasApiKey,
  isRecording,
  batches,
  settings,
  latestTranscriptChunk,
  onBatchCreated,
  onManualRefresh,
  onSuggestionClick,
  refreshRequest,
  silenceStreakCount,
}) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const lastAutoChunkRef = useRef('');
  const lastRefreshTokenRef = useRef(0);
  const inFlightKeyRef = useRef('');
  const lastCompletedKeyRef = useRef('');

  const transcriptWordCount = useMemo(
    () => spokenTranscriptText.trim().split(/\s+/).filter(Boolean).length,
    [spokenTranscriptText]
  );

  const previousSuggestions = useMemo(
    () =>
      batches
        .slice(0, 3)
        .flatMap((batch) =>
          batch.suggestions.map(
            (suggestion) => `${suggestion.type}: ${suggestion.title} - ${suggestion.preview}`
          )
        )
        .slice(0, 9),
    [batches]
  );

  const pullSuggestions = useCallback(async (source = 'auto') => {
    if (!hasApiKey || !transcriptText.trim()) {
      return;
    }

    const requestKey =
      source === 'auto'
        ? `auto:${latestTranscriptChunk}`
        : `${source}:${refreshRequest?.token || silenceStreakCount}:${batches.length}`;

    if (!latestTranscriptChunk.trim() && source === 'auto') {
      return;
    }

    if (inFlightKeyRef.current === requestKey || lastCompletedKeyRef.current === requestKey) {
      return;
    }

    try {
      inFlightKeyRef.current = requestKey;
      setIsLoading(true);
      setError('');

      const data = await fetchSuggestions({
        transcript_slice: transcriptText,
        latest_transcript_chunk: latestTranscriptChunk,
        meeting_memory: settings.meetingMemory,
        previous_suggestions: previousSuggestions,
        silence_streak_count: silenceStreakCount,
        context_window: settings.suggestionsContextWindow,
        suggestions_prompt: settings.suggestionsPrompt,
      });

      const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (items.length === 3) {
        onBatchCreated?.(items, source);
      }
      lastCompletedKeyRef.current = requestKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load suggestions.');
    } finally {
      if (inFlightKeyRef.current === requestKey) {
        inFlightKeyRef.current = '';
      }
      setIsLoading(false);
    }
  }, [
    hasApiKey,
    batches.length,
    latestTranscriptChunk,
    onBatchCreated,
    previousSuggestions,
    refreshRequest,
    settings.meetingMemory,
    settings.suggestionsContextWindow,
    settings.suggestionsPrompt,
    silenceStreakCount,
    transcriptText,
  ]);

  useEffect(() => {
    if (!refreshRequest?.token || !hasApiKey || !transcriptText.trim()) {
      return;
    }

    if (refreshRequest.source === 'auto') {
      if (!isRecording || transcriptWordCount < 8 || !latestTranscriptChunk.trim()) {
        return;
      }
      if (lastAutoChunkRef.current === latestTranscriptChunk) {
        return;
      }
      lastAutoChunkRef.current = latestTranscriptChunk;
    }

    if (lastRefreshTokenRef.current === refreshRequest.token) {
      return;
    }
    lastRefreshTokenRef.current = refreshRequest.token;

    const timer = setTimeout(() => {
      pullSuggestions(refreshRequest.source || 'manual');
    }, 0);

    return () => clearTimeout(timer);
  }, [hasApiKey, isRecording, latestTranscriptChunk, pullSuggestions, refreshRequest, transcriptText, transcriptWordCount]);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.label}>2. LIVE SUGGESTION</span>
        </div>
        <div style={styles.headerBottom}>
          <button
            style={styles.reloadBtn}
            onClick={onManualRefresh}
            disabled={!hasApiKey || !transcriptText.trim() || isLoading}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
            }}>
            <ReloadIcon />
            {isLoading ? 'Loading...' : 'Refresh now'}
          </button>
        </div>
      </div>

      <div style={styles.body} className="scrollable">
        {error && <div style={styles.errorText}>{error}</div>}
        {!hasApiKey && <div style={styles.placeholder}>Add a Groq API key in Settings first.</div>}
        {hasApiKey && !isRecording && (
          <div style={styles.placeholder}>Start transcription to generate live suggestions.</div>
        )}
        {hasApiKey && isRecording && transcriptWordCount < 8 && (
          <div style={styles.placeholder}>Keep talking. Suggestions start after a bit more transcript context.</div>
        )}
        {silenceStreakCount > 0 && (
          <div style={styles.placeholder}>
            Silence detected for {silenceStreakCount * 30}s. The assistant will preserve context and surface restart or unblock ideas without spamming every silent window.
          </div>
        )}

        {batches.map((batch, batchIndex) => (
          <React.Fragment key={batch.id}>
            {batch.suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={`${batch.id}-${index}`}
                type={suggestion.type}
                title={suggestion.title}
                preview={suggestion.preview}
                faded={batchIndex > 0}
                onClick={onSuggestionClick}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    minHeight: 0,
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 92,
  },
  headerTop: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  headerBottom: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    marginTop: 10,
  },
  label: {
    fontFamily: 'var(--font-head)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
  },
  reloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 13px',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9b2f23',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  },
  placeholder: {
    fontSize: 13,
    color: 'var(--text-2)',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 12,
    background: 'rgba(255,255,255,0.5)',
  },
};
