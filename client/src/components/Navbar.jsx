import React, { useState } from 'react';

import { DEFAULT_SESSION_SETTINGS, normalizeSessionSettings } from '../sessionSettings';

const HamburgerIcon = () => (
  <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
    <rect y="0" width="20" height="2" rx="1" fill="currentColor" />
    <rect y="7" width="20" height="2" rx="1" fill="currentColor" />
    <rect y="14" width="20" height="2" rx="1" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15.4a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 005 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009.4 5a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09A1.65 1.65 0 0015.4 5a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019 8.6c.2.49.68.81 1.21.82H21a2 2 0 110 4h-.09c-.53 0-1.01.33-1.21.82z" />
  </svg>
);

const Logo = () => (
  <div style={styles.logo}>
    <span>twin</span>
    <span style={styles.neuron}>
      <span style={styles.neuronDot} />
      <span style={styles.neuronLine} />
      <span style={styles.neuronDot} />
    </span>
    <span>mind</span>
  </div>
);


function SettingsModal({ initialSettings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizeSessionSettings(initialSettings));

  const updateField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Session Settings</h3>
        <p style={styles.modalHint}>Stored only for this browser session.</p>

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Groq API Key</label>
          <input
            type="password"
            value={draft.apiKey}
            onChange={(e) => updateField('apiKey', e.target.value)}
            placeholder="gsk_..."
            style={styles.modalInput}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Meeting memory / prep notes</label>
          <textarea
            value={draft.meetingMemory}
            onChange={(e) => updateField('meetingMemory', e.target.value)}
            placeholder="Paste previous meeting notes, email context, agenda, decisions, or any prep material you want the assistant to remember for this session."
            style={styles.modalTextarea}
          />
        </div>

        <div style={styles.modalActions}>
          <button style={styles.modalSecondary} onClick={onClose}>Cancel</button>
          <button
            style={styles.modalSecondary}
            onClick={() => {
              const cleared = { ...draft, apiKey: '' };
              setDraft(cleared);
              onSave(cleared);
            }}>
            Clear key
          </button>
          <button
            style={styles.modalSecondary}
            onClick={() => setDraft({ ...DEFAULT_SESSION_SETTINGS })}>
            Reset defaults
          </button>
          <button
            style={styles.modalPrimary}
            onClick={() => {
              onSave(draft);
              onClose();
            }}>
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar({ settings, onSaveSettings, onExportSession, canExport }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const runPageSearch = (backward = false) => {
    const query = searchQuery.trim();
    if (!query || typeof window === 'undefined' || typeof window.find !== 'function') {
      return;
    }

    window.find(query, false, backward, true, false, false, false);
  };

  return (
    <>
      <nav style={styles.navbar}>
        <button style={styles.hamburger} title="Menu">
          <HamburgerIcon />
        </button>

        <div style={styles.searchWrap}>
          <input
            style={styles.searchInput}
            placeholder="Search on page"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runPageSearch(e.shiftKey);
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.background = 'var(--neutral)';
            }}
          />
          <button
            style={styles.searchBtn}
            onClick={() => runPageSearch(false)}
            title="Find next match">
            <span style={styles.searchIcon}><SearchIcon /></span>
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={styles.actions}>
          <button
            style={{ ...styles.settingsBtn, opacity: canExport ? 1 : 0.45 }}
            onClick={onExportSession}
            disabled={!canExport}>
            <ExportIcon />
            <span>Export</span>
          </button>
          <button style={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
            <span>Settings</span>
          </button>
          <div style={styles.divider} />
          <Logo />
        </div>
      </nav>

      {settingsOpen && (
        <SettingsModal
          initialSettings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={onSaveSettings}
        />
      )}
    </>
  );
}

const styles = {
  navbar: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    minHeight: 60,
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexWrap: 'wrap',
  },
  hamburger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--nav-text)',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    flexShrink: 0,
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    maxWidth: 420,
    flex: 1,
    minWidth: 180,
  },
  searchInput: {
    width: '100%',
    height: 38,
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    padding: '0 40px 0 18px',
    fontFamily: 'var(--font-body)',
    fontSize: 13.5,
    color: 'var(--nav-text)',
    background: 'var(--neutral)',
    outline: 'none',
    transition: 'border-color 0.15s, background 0.15s',
  },
  searchIcon: {
    color: '#8fa0b3',
    display: 'flex',
    alignItems: 'center',
  },
  searchBtn: {
    position: 'absolute',
    right: 10,
    width: 30,
    height: 30,
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--nav-text)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  divider: {
    width: 1,
    height: 22,
    background: 'var(--border)',
    margin: '0 8px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'var(--font-head)',
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--nav-text)',
    letterSpacing: '-0.3px',
    flexShrink: 0,
    userSelect: 'none',
    gap: 1,
  },
  neuron: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    margin: '0 1px',
  },
  neuronDot: {
    width: 5,
    height: 5,
    background: '#F28C28',
    borderRadius: '50%',
    display: 'block',
  },
  neuronLine: {
    width: 2,
    height: 8,
    background: '#F28C28',
    borderRadius: 1,
    display: 'block',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 120,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 14,
    width: 'min(960px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    padding: 20,
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.25)',
  },
  modalTitle: {
    fontFamily: 'var(--font-head)',
    fontSize: 20,
    color: 'var(--text-1)',
  },
  modalHint: {
    marginTop: 6,
    fontSize: 13,
    color: 'var(--text-2)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-2)',
  },
  modalInput: {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--text-1)',
    background: 'var(--surface)',
    outline: 'none',
  },
  modalTextarea: {
    width: '100%',
    minHeight: 160,
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--text-1)',
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
    outline: 'none',
    background: 'var(--surface)',
  },
  modalActions: {
    marginTop: 18,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondary: {
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-2)',
    borderRadius: 999,
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  modalPrimary: {
    border: 'none',
    background: 'var(--primary)',
    color: '#fff',
    borderRadius: 999,
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
};
