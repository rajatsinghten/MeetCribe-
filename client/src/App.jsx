import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

import Navbar from './components/Navbar';
import TranscriptPanel from './components/TranscriptPanel';
import LiveSuggestionsPanel from './components/LiveSuggestionsPanel';
import ChatPanel from './components/ChatPanel';
import ApiKeyModal from './components/ApiKeyModal';
import { exportSessionAsJson, warmupBackend } from './api';
import {
  formatSessionTimestamp,
  loadSessionSettings,
  saveSessionSettings,
} from './sessionSettings';

export default function App() {
  const transcriptPanelRef = useRef(null);
  const nextSuggestionBatchIdRef = useRef(1);
  const startupWarmupSentRef = useRef(false);
  const lastApiKeyRef = useRef('');

  const [settings, setSettings] = useState(loadSessionSettings);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [suggestionBatches, setSuggestionBatches] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [latestTranscriptChunk, setLatestTranscriptChunk] = useState('');
  const [silenceStreakCount, setSilenceStreakCount] = useState(0);
  const [refreshRequest, setRefreshRequest] = useState({ token: 0, source: 'manual' });

  const hasApiKey = settings.apiKey.trim().length > 0;

  useEffect(() => {
    const currentApiKey = settings.apiKey.trim();
    if (currentApiKey !== lastApiKeyRef.current) {
      startupWarmupSentRef.current = false;
      lastApiKeyRef.current = currentApiKey;
    }
  }, [settings.apiKey]);

  useEffect(() => {
    if (!hasApiKey || startupWarmupSentRef.current) {
      return;
    }

    startupWarmupSentRef.current = true;
    void warmupBackend().catch(() => {
      startupWarmupSentRef.current = false;
    });
  }, [hasApiKey, settings.apiKey]);

  const handleSaveSettings = useCallback((nextSettings) => {
    const normalized = saveSessionSettings(nextSettings);
    setSettings(normalized);
  }, []);

  const handleTranscriptChunk = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const timestamp = formatSessionTimestamp();
    setLatestTranscriptChunk(trimmed);
    setSilenceStreakCount(0);
    setTranscriptEntries((prev) => [
      ...prev,
      { time: timestamp.label, isoTime: timestamp.iso, text: trimmed, kind: 'speech' },
    ]);
    setRefreshRequest({ token: Date.now(), source: 'auto' });
  }, []);

  const handleSilencePeriod = useCallback(({ streakCount, secondsSilent }) => {
    const timestamp = formatSessionTimestamp();
    const hasSpokenContext =
      latestTranscriptChunk.trim().length > 0 ||
      transcriptEntries.some((entry) => entry.kind === 'speech');
    const silenceText =
      streakCount === 1
        ? `[Silence for ${secondsSilent} seconds]`
        : `[Silence continuing for ${secondsSilent} seconds total]`;

    setSilenceStreakCount(streakCount);
    setTranscriptEntries((prev) => {
      const next = [...prev];
      const lastEntry = next[next.length - 1];

      if (lastEntry?.kind === 'silence') {
        next[next.length - 1] = {
          ...lastEntry,
          time: timestamp.label,
          isoTime: timestamp.iso,
          text: silenceText,
          silenceSeconds: secondsSilent,
        };
        return next;
      }

      return [
        ...next,
        {
          time: timestamp.label,
          isoTime: timestamp.iso,
          text: silenceText,
          kind: 'silence',
          silenceSeconds: secondsSilent,
        },
      ];
    });

    if (hasSpokenContext && (streakCount === 1 || streakCount % 3 === 0)) {
      setRefreshRequest({ token: Date.now(), source: 'silence' });
    }
  }, [latestTranscriptChunk, transcriptEntries]);

  const fullTranscript = useMemo(
    () => transcriptEntries.map((entry) => entry.text).join(' '),
    [transcriptEntries]
  );

  const spokenTranscript = useMemo(
    () =>
      transcriptEntries
        .filter((entry) => entry.kind !== 'silence')
        .map((entry) => entry.text)
        .join(' '),
    [transcriptEntries]
  );

  const handleSuggestionBatch = useCallback((suggestions, source = 'auto') => {
    const timestamp = formatSessionTimestamp();
    setSuggestionBatches((prev) => [
      {
        id: nextSuggestionBatchIdRef.current++,
        source,
        time: timestamp.label,
        isoTime: timestamp.iso,
        suggestions,
      },
      ...prev,
    ]);
  }, []);

  const handleSuggestionClick = useCallback((text) => {
    setPendingMessage({ text, at: Date.now(), mode: 'suggestion' });
  }, []);

  const handleManualRefresh = useCallback(async () => {
    const hadNewTranscript = await transcriptPanelRef.current?.flushCurrentSegment?.();
    if (!hadNewTranscript) {
      setRefreshRequest({ token: Date.now(), source: 'manual' });
    }
  }, []);

  const handleExportSession = useCallback(() => {
    const exportableSettings = { ...settings };
    delete exportableSettings.apiKey;

    exportSessionAsJson({
      exported_at: new Date().toISOString(),
      transcript_entries: transcriptEntries,
      suggestion_batches: suggestionBatches,
      chat_history: chatMessages,
      settings: exportableSettings,
    });
  }, [chatMessages, settings, suggestionBatches, transcriptEntries]);

  return (
    <div style={styles.root}>
      <Navbar
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onExportSession={handleExportSession}
        canExport={
          transcriptEntries.length > 0 || suggestionBatches.length > 0 || chatMessages.length > 0
        }
      />

      {!hasApiKey && (
        <ApiKeyModal 
          onSave={(apiKey) => handleSaveSettings({ ...settings, apiKey })} 
        />
      )}

      <div className="app-layout" style={styles.layout}>
        <TranscriptPanel
          ref={transcriptPanelRef}
          entries={transcriptEntries}
          hasApiKey={hasApiKey}
          onSilencePeriod={handleSilencePeriod}
          onTranscriptChunk={handleTranscriptChunk}
          onRecordingChange={setIsRecording}
        />

        <LiveSuggestionsPanel
          batches={suggestionBatches}
          hasApiKey={hasApiKey}
          isRecording={isRecording}
          latestTranscriptChunk={latestTranscriptChunk}
          onBatchCreated={handleSuggestionBatch}
          onManualRefresh={handleManualRefresh}
          onSuggestionClick={handleSuggestionClick}
          refreshRequest={refreshRequest}
          silenceStreakCount={silenceStreakCount}
          settings={settings}
          transcriptText={fullTranscript}
          spokenTranscriptText={spokenTranscript}
        />

        <ChatPanel
          chatMessages={chatMessages}
          hasApiKey={hasApiKey}
          pendingMessage={pendingMessage}
          fullTranscript={fullTranscript}
          setChatMessages={setChatMessages}
          settings={settings}
        />
      </div>
    </div>
  );
}

const styles = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--neutral)',
    overflow: 'hidden',
  },
  layout: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '30fr 40fr 30fr',
    gap: 14,
    padding: 14,
    overflow: 'hidden',
    minHeight: 0,
    height: '100%',
  },
};
