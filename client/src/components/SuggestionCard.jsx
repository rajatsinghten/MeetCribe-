import React from 'react';

const TAG_STYLES = {
  ANSWER:          { background: 'rgba(0,61,91,0.08)', color: '#003D5B', dot: '#003D5B' },
  QUESTION_TO_ASK: { background: 'rgba(0,96,100,0.09)', color: '#006064', dot: '#006064' },
  TALKING_POINT:   { background: 'rgba(240,128,60,0.10)', color: '#b55e24', dot: '#F0803C' },
  FACT_CHECK:      { background: 'rgba(196,135,10,0.10)', color: '#c4870a', dot: '#c4870a' },
  CLARIFICATION:   { background: 'rgba(76,88,104,0.10)', color: '#4c5868', dot: '#4c5868' },
};

const TAG_LABELS = {
  ANSWER: 'Answer',
  QUESTION_TO_ASK: 'Question to ask',
  TALKING_POINT: 'Talking point',
  FACT_CHECK: 'Fact-check',
  CLARIFICATION: 'Clarification',
};

export default function SuggestionCard({ type, title, preview, faded = false, onClick }) {
  const tag = TAG_STYLES[type] ?? TAG_STYLES.ANSWER;

  return (
    <div
      style={{ ...styles.card, opacity: faded ? 0.55 : 1 }}
      onClick={() => onClick?.(`${title}: ${preview}`)}
      onMouseEnter={e => {
        if (!faded) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}>

      <div style={{ ...styles.tag, background: tag.background, color: tag.color }}>
        <span style={{ ...styles.tagDot, background: tag.dot }} />
        {TAG_LABELS[type] || 'Suggestion'}
      </div>

      <h4 style={styles.title}>{title}</h4>
      <p style={styles.text}>{preview}</p>

    </div>
  );
}

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 18px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s, transform 0.15s',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 8,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  title: {
    fontSize: 14,
    lineHeight: 1.4,
    color: 'var(--text-1)',
    marginBottom: 5,
  },
  text: {
    fontSize: 13.5,
    lineHeight: 1.6,
    color: 'var(--text-1)',
    paddingLeft: 2,
  },
};
