import React from 'react';
import { useConversationState } from '../store/conversationState';
import { useNavigationState } from '../store/navigationState';

const ScoringScreen: React.FC = () => {
  const { scoreResult } = useConversationState();
  const { setCurrentScreen } = useNavigationState();

  if (!scoreResult) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Your Conversation Score</h1>
        <p style={styles.scoreDetail}>No score result found. Please restart the scenario.</p>
        <button style={styles.cta} onClick={() => setCurrentScreen('scenario_overview')}>
          Restart Scenario
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Your Conversation Score</h1>

      <div style={styles.scoreBox}>
        <h2 style={styles.scoreTier}>{scoreResult.tier.toUpperCase()}</h2>
        <p style={styles.scoreDetail}>Clarity: {scoreResult.clarity}</p>
        <p style={styles.scoreDetail}>Empathy: {scoreResult.empathy}</p>
        <p style={styles.scoreDetail}>Directness: {scoreResult.directness}</p>
      </div>

      <button style={styles.cta} onClick={() => setCurrentScreen('feedback')}>
        View Feedback
      </button>
    </div>
  );
};

export default ScoringScreen;

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif'
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '24px'
  },
  scoreBox: {
    backgroundColor: '#f4f4f4',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '32px'
  },
  scoreTier: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '12px'
  },
  scoreDetail: {
    fontSize: '16px',
    marginBottom: '6px'
  },
  cta: {
    padding: '16px 28px',
    fontSize: '18px',
    fontWeight: 600,
    backgroundColor: '#0078D4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};
