import React from 'react';

import { useNavigationState } from '../store/navigationState';
import { useS02SessionState } from '../store/s02SessionState';
import { useActiveScenarioState } from '../store/activeScenarioState';
import { useScenarioProgressState } from '../store/scenarioProgressState';
import {
  SCENARIO_REGISTRY,
  ScenarioRegistryEntry
} from '../data/scenarioRegistry';

/**
 * The scenario selector.
 *
 * Routes by flow kind rather than by id: 'legacy' scenarios use MT-S01's
 * seven screens and its existing engines, 'blueprint' scenarios use the
 * MT-S02 stage machine. The two JSON shapes are incompatible, so one set
 * of screens could not render both without rewriting Scenario 1.
 */
const ScenarioSelectScreen: React.FC = () => {
  const setCurrentScreen = useNavigationState((state) => state.setCurrentScreen);
  const resetS02 = useS02SessionState((state) => state.resetSession);
  const setActiveScenario = useActiveScenarioState((state) => state.setActiveScenario);
  const resetProgress = useScenarioProgressState((state) => state.resetProgress);

  const open = (entry: ScenarioRegistryEntry) => {
    // Order matters. The progress store is cleared first so the two hooks
    // cannot save the outgoing scenario's step against the incoming
    // scenario's document during the render in between.
    resetProgress();
    setActiveScenario(entry.scenarioId);

    if (entry.flowKind === 'blueprint') {
      resetS02();
      setCurrentScreen('s02_sbi');
      return;
    }
    setCurrentScreen('scenario_overview');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>ManagerTalk</p>
        <h1 style={styles.title}>Scenarios</h1>
      </header>

      <div style={styles.divider} />

      <div style={styles.grid}>
        {SCENARIO_REGISTRY.map((entry) => (
          <button
            key={entry.scenarioId}
            style={styles.scenarioCard}
            onClick={() => open(entry)}
          >
            <span style={styles.cardEyebrow}>{entry.scenarioId}</span>
            <span style={styles.cardTitle}>{entry.title}</span>
            <span style={styles.cardBadge}>{entry.difficulty}</span>
            <span style={styles.cardCompetency}>{entry.primaryCompetency}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScenarioSelectScreen;

// -----------------------------
// Styles
// -----------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif',
    lineHeight: 1.6,
    color: '#1a1a1a'
  },
  header: {
    marginBottom: '28px'
  },
  eyebrow: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    margin: '0 0 10px 0'
  },
  title: {
    fontSize: '34px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    margin: 0
  },
  divider: {
    height: '1px',
    backgroundColor: '#e6e6e6',
    margin: '0 0 36px 0'
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px'
  },
  scenarioCard: {
    flex: '1 1 380px',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '24px',
    textAlign: 'left',
    backgroundColor: '#fff',
    border: '1px solid #e6e6e6',
    borderLeft: '3px solid #0078D4',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  },
  cardEyebrow: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: '#1a1a1a'
  },
  cardBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    backgroundColor: '#eef4fb',
    color: '#0b5fa5',
    fontSize: '13px',
    fontWeight: 600
  },
  cardCompetency: {
    fontSize: '15px',
    color: '#444'
  }
};
