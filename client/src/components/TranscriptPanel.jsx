import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { transcribeAudioBlob } from '../api';

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 10a7 7 0 0014 0M12 19v4M8 23h8" />
  </svg>
);

const TranscriptEntry = ({ time, text, isLast }) => (
  <div style={{ ...styles.entry, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
    <div style={styles.time}>{time}</div>
    <div style={styles.text}>{text}</div>
  </div>
);

const TranscriptPanel = forwardRef(function TranscriptPanel(
  { entries, hasApiKey, onTranscriptChunk, onRecordingChange, onSilencePeriod },
  ref
) {
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState('Stopped. Click to resume.');
  const bodyRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const segmentTimeoutRef = useRef(null);
  const isRecordingRef = useRef(false);
  const silenceStreakRef = useRef(0);
  const segmentChunksRef = useRef([]);
  const manualFlushResolveRef = useRef(null);

  const getRecorderMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
  };

  const clearSegmentTimeout = () => {
    if (segmentTimeoutRef.current) {
      clearTimeout(segmentTimeoutRef.current);
      segmentTimeoutRef.current = null;
    }
  };

  const sendSegmentForTranscription = async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 1024) {
      return false;
    }

    try {
      setStatusText('Transcribing the latest audio chunk...');
      const result = await transcribeAudioBlob(audioBlob);
      const transcriptText = result?.text || '';
      if (transcriptText.trim()) {
        silenceStreakRef.current = 0;
        onTranscriptChunk(transcriptText);
        setStatusText('Recording live. Capturing audio every 30s.');
        return true;
      }

      silenceStreakRef.current += 1;
      onSilencePeriod?.({
        streakCount: silenceStreakRef.current,
        secondsSilent: silenceStreakRef.current * 30,
      });
      setStatusText('Recording live. No speech detected in the last chunk.');
      return false;
    } catch {
      setStatusText('Transcription failed for the last segment. Continuing...');
      return false;
    }
  };

  const startRecorderSegment = (stream) => {
    const mimeType = getRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    segmentChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        segmentChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const segmentBlob = new Blob(segmentChunksRef.current, {
        type: recorder.mimeType || mimeType || 'audio/webm',
      });
      segmentChunksRef.current = [];

      const hadTranscript = await sendSegmentForTranscription(segmentBlob);

      if (manualFlushResolveRef.current) {
        manualFlushResolveRef.current(hadTranscript);
        manualFlushResolveRef.current = null;
      }

      if (isRecordingRef.current && streamRef.current) {
        startRecorderSegment(streamRef.current);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);

    clearSegmentTimeout();
    segmentTimeoutRef.current = setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, 30000);
  };

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      clearSegmentTimeout();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async flushCurrentSegment() {
      if (!isRecordingRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        return;
      }

      clearSegmentTimeout();

      return new Promise((resolve) => {
        manualFlushResolveRef.current = resolve;
        mediaRecorderRef.current.stop();
      }).then((hadTranscript) => {
        setStatusText('Recording live. Last segment flushed just now.');
        return hadTranscript;
      });
    },
  }));

  const stopRecording = () => {
    isRecordingRef.current = false;
    clearSegmentTimeout();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    silenceStreakRef.current = 0;
    onRecordingChange?.(false);
    setStatusText('Stopped. Click to resume.');
  };

  const startRecording = async () => {
    if (!hasApiKey) {
      setStatusText('Add API key in Settings before recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      isRecordingRef.current = true;
      silenceStreakRef.current = 0;
      setIsRecording(true);
      onRecordingChange?.(true);
      setStatusText('Recording live. Capturing audio every 30s.');
      startRecorderSegment(stream);
    } catch {
      isRecordingRef.current = false;
      onRecordingChange?.(false);
      setStatusText('Microphone permission denied or unavailable.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    startRecording();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.label}>1. Mic &amp; Transcript</span>
        <div style={styles.micRow}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isRecording && <div className="pulse-ring" />}
            <button
              style={{ 
                ...styles.micBtn, 
                background: isRecording ? '#ef4444' : 'var(--primary)',
                boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
              }}
              title={isRecording ? 'Stop recording' : 'Start recording'}
              onClick={toggleRecording}>
              <MicIcon />
            </button>
          </div>
          <div style={styles.micStatus}>
            <strong style={styles.micStatusStrong}>
              <span style={isRecording ? styles.liveDot : styles.idleDot} /> {isRecording ? 'Live' : 'Idle'}
            </strong>
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      <div ref={bodyRef} style={styles.body} className="scrollable-dark">
        {entries.length === 0 && (
          <div style={styles.emptyState}>Transcript will appear here once recording starts.</div>
        )}
        {entries.map((entry, i) => (
          <TranscriptEntry
            key={`${entry.isoTime || entry.time}-${i}`}
            time={entry.time}
            text={entry.text}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>
    </div>
  );
});

export default TranscriptPanel;

const styles = {
  panel: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    minHeight: 0,
  },
  header: {
    padding: 20,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flexShrink: 0,
  },
  label: {
    fontFamily: 'var(--font-head)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
  },
  micRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.3s ease',
    position: 'relative',
    zIndex: 2,
  },
  micStatus: {
    fontSize: 13,
    color: 'var(--text-2)',
    lineHeight: 1.4,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  micStatusStrong: {
    color: 'var(--text-1)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  idleDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    background: 'var(--text-3)',
    borderRadius: '50%',
  },
  liveDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    background: '#F0803C',
    borderRadius: '50%',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px 20px',
    minHeight: 0,
  },
  emptyState: {
    marginTop: 16,
    fontSize: 13,
    color: 'var(--text-3)',
  },
  entry: {
    padding: '14px 0',
  },
  time: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-3)',
    letterSpacing: '0.05em',
    marginBottom: 5,
  },
  text: {
    fontSize: 13.5,
    color: 'var(--text-1)',
    lineHeight: 1.6,
  },
};
