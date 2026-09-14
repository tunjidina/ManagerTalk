import React, { Suspense, useEffect, useState } from 'react';
import { useNavigationState, Screen } from './store/navigationState';
import { useConversationState } from './store/conversationState';

import ErrorBoundary from './components/ErrorBoundary';
import LoadingOverlay from './components/LoadingOverlay';
import LoadingFallback from './components/LoadingFallback';
import ResetModal from './components/ResetModal';
import RestoreModal from './components/RestoreModal';

import {
  SavedSession,
  loadSession,
  applySession,
  clearSession,
  startAutosave
} from './utils/sessionPersistence';

// Screens
import ScenarioOverviewScreen from './screens/ScenarioOverviewScreen';
import EvidenceScreen from './screens/EvidenceScreen';
import ConversationFlowScreen from './screens/ConversationFlowScreen';
import CommitmentBuilderScreen from './screens/CommitmentBuilderScreen';
import ClosingScreen from './screens/ClosingScreen';
import ScoringScreen from './screens/ScoringScreen';
import FeedbackScreen from './screens/FeedbackScreen';

// -----------------------------
// Display-only step metadata (no navigation)
// -----------------------------

const TOTAL_STEPS = 7;

const stepInfo: Record<Screen, { step: number; label: string }> = {
  scenario_overview: { step: 1, label: 'Scenario Overview' },
  overview: { step: 1, label: 'Scenario Overview' },
  evidence: { step: 2, label: 'Evidence Review' },
  conversation_flow: { step: 3, label: 'Conversation' },
  conversation: { step: 3, label: 'Conversation' },
  commitment_builder: { step: 4, label: 'Commitments' },
  closing: { step: 5, label: 'Closing' },
  scoring: { step: 6, label: 'Scoring' },
  feedback: { step: 7, label: 'Feedback' }
};

const App: React.FC = () => {
  const { currentScreen, resetNavigation } = useNavigationState();
  const { resetConversation } = useConversationState();

  // Simple local state for the global overlay. Wrap any future async work
  // (fetching a scenario, saving a session) in setIsLoading(true/false).
  const [isLoading, setIsLoading] = useState(false);

  // Confirmation gate for user-initiated resets.
  const [resetRequested, setResetRequested] = useState(false);

  // Session restore: pendingSession holds the snapshot awaiting a decision.
  const [pendingSession, setPendingSession] = useState<SavedSession | null>(null);
  const [restoreResolved, setRestoreResolved] = useState(false);

  // Look for a saved session once, on load.
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setPendingSession(saved);
    } else {
      setRestoreResolved(true);
    }
  }, []);

  // Autosave starts only after the restore decision, so the app's initial
  // empty state never overwrites a snapshot the user has not answered for.
  useEffect(() => {
    if (!restoreResolved) {
      return;
    }
    return startAutosave();
  }, [restoreResolved]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'scenario_overview':
        return <ScenarioOverviewScreen />;

      case 'evidence':
        return <EvidenceScreen />;

      case 'conversation_flow':
        return <ConversationFlowScreen />;

      case 'commitment_builder':
        return <CommitmentBuilderScreen />;

      case 'closing':
        return <ClosingScreen />;

      case 'scoring':
        return <ScoringScreen />;

      case 'feedback':
        return <FeedbackScreen />;

      default:
        return <ScenarioOverviewScreen />;
    }
  };

  // The actual reset: the stores' own reset actions.
  const performReset = () => {
    setIsLoading(true);
    resetConversation();
    resetNavigation();
    setIsLoading(false);
  };

  // User-initiated reset: ask first.
  const requestReset = () => setResetRequested(true);
  const cancelReset = () => setResetRequested(false);

  const confirmReset = () => {
    setResetRequested(false);
    clearSession();
    performReset();
  };

  // Error-boundary recovery resets directly, without the confirmation step:
  // the boundary clears its own error state as soon as onReset returns, so a
  // pending dialog would let the broken screen render again behind it.
  const handleBoundaryReset = () => {
    clearSession();
    performReset();
  };

  // Restore decisions.
  const handleContinueSession = () => {
    if (pendingSession) {
      applySession(pendingSession);
    }
    setPendingSession(null);
    setRestoreResolved(true);
  };

  const handleStartOver = () => {
    clearSession();
    performReset();
    setPendingSession(null);
    setRestoreResolved(true);
  };

  const current = stepInfo[currentScreen] || stepInfo.scenario_overview;
  const progress = Math.round((current.step / TOTAL_STEPS) * 100);

  return (
    <div style={styles.app}>
      {/* Top frame */}
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.brand}>
            <span style={styles.brandMark} aria-hidden="true" />
            <span style={styles.brandName}>ManagerTalk</span>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.progressGroup}>
              <span style={styles.stepText}>
                Step {current.step} of {TOTAL_STEPS} · {current.label}
              </span>
              <div style={styles.progressTrack} aria-hidden="true">
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
            </div>

            <button style={styles.resetButton} onClick={requestReset}>
              Restart
            </button>
          </div>
        </div>
      </header>

      {/* Screen surface */}
      <main style={styles.main}>
        <ErrorBoundary onReset={handleBoundaryReset}>
          <Suspense fallback={<LoadingFallback />}>{renderScreen()}</Suspense>
        </ErrorBoundary>
      </main>

      {/* Global overlay */}
      <LoadingOverlay visible={isLoading} />

      {/* Session reset confirmation */}
      <ResetModal
        visible={resetRequested}
        onCancel={cancelReset}
        onConfirm={confirmReset}
      />

      {/* Saved session restore */}
      <RestoreModal
        visible={pendingSession !== null}
        savedAt={pendingSession ? pendingSession.savedAt : undefined}
        onContinue={handleContinueSession}
        onStartOver={handleStartOver}
      />
    </div>
  );
};

export default App;

// -----------------------------
// Styles
// -----------------------------

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#f5f6f7',
    fontFamily: 'Inter, sans-serif',
    color: '#1a1a1a',
    boxSizing: 'border-box'
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e6e6e6'
  },
  topBarInner: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '16px 40px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandMark: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    backgroundColor: '#0078D4'
  },
  brandName: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.01em'
  },
  headerRight: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '20px'
  },
  progressGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
    minWidth: '200px'
  },
  stepText: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#6b7280'
  },
  progressTrack: {
    width: '200px',
    height: '4px',
    borderRadius: '999px',
    backgroundColor: '#ededed',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    backgroundColor: '#0078D4'
  },
  resetButton: {
    padding: '9px 16px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d4d4d4',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  },
  main: {
    // Screens own their own 900px column and 40px padding,
    // so the shell adds surface and vertical rhythm only.
    paddingBottom: '48px'
  }
};