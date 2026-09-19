// src/hooks/useScenarioProgress.ts
//
// One hook, mounted once in App.tsx, that keeps Firestore in step with the
// navigation store.
//
// Why here and not in each screen:
// ManagerTalk has no router. Every screen change is one value changing in
// navigationState, which means a single subscription sees all seven
// transitions. Putting a useEffect in each of the seven screens would be
// seven copies of the same code, seven chances for the guards to drift,
// and a save that silently stops working the day a screen is renamed.
//
// The screens are not modified at all. They keep calling
// setCurrentScreen(...) exactly as they do today.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuthState } from '../store/authState';
import { useNavigationState } from '../store/navigationState';
import { useScenarioProgressState } from '../store/scenarioProgressState';
import {
  SCENARIO_ID,
  FINAL_STEP,
  ScenarioStep,
  ScenarioProgressStatus,
  screenToStep,
  stepToScreen
} from '../types/scenarioProgress';
import {
  loadScenarioState,
  saveScenarioState,
  markScenarioCompleted
} from '../engine/scenarioState';

export interface UseScenarioProgressOptions {
  /**
   * Gate for the whole hook. Pass false until the user is signed in AND
   * any local-session restore prompt has been answered — otherwise the
   * Firestore read races the localStorage restore and one overwrites the
   * other.
   */
  enabled: boolean;

  /**
   * When true, a saved step navigates the app there on load. Pass false
   * when the user has just chosen to continue a locally saved session:
   * that snapshot holds the full conversation, so it outranks the step
   * pointer in Firestore.
   */
  resume: boolean;
}

export interface UseScenarioProgressApi {
  status: ScenarioProgressStatus;
  saving: boolean;
  lastError: string | null;
  completed: boolean;
  /** Re-runs the initial load after a failure. */
  retry: () => void;
}

export function useScenarioProgress(
  options: UseScenarioProgressOptions
): UseScenarioProgressApi {
  const { enabled, resume } = options;

  const user = useAuthState((state) => state.user);
  const uid = user ? user.uid : null;

  const currentScreen = useNavigationState((state) => state.currentScreen);
  const setCurrentScreen = useNavigationState((state) => state.setCurrentScreen);

  const status = useScenarioProgressState((state) => state.status);
  const saving = useScenarioProgressState((state) => state.saving);
  const lastError = useScenarioProgressState((state) => state.lastError);
  const completed = useScenarioProgressState((state) => state.completed);

  const beginLoad = useScenarioProgressState((state) => state.beginLoad);
  const loadSucceeded = useScenarioProgressState((state) => state.loadSucceeded);
  const loadFailed = useScenarioProgressState((state) => state.loadFailed);
  const beginSave = useScenarioProgressState((state) => state.beginSave);
  const saveSucceeded = useScenarioProgressState((state) => state.saveSucceeded);
  const saveFailed = useScenarioProgressState((state) => state.saveFailed);

  // Which uid has been loaded already. Stops the load effect refiring on
  // every unrelated render.
  const loadedUidRef = useRef<string | null>(null);

  // The step Firestore already holds. Compared against the visible screen
  // to decide whether a write is actually needed.
  const savedStepRef = useRef<ScenarioStep | null>(null);

  // Sticky: once the scenario is completed it stays completed, even if the
  // user navigates back through the screens afterwards.
  const completedRef = useRef(false);

  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    loadedUidRef.current = null;
    setRetryToken((token) => token + 1);
  }, []);

  // -----------------------------
  // 1. Load on entry
  // -----------------------------

  useEffect(() => {
    if (!enabled || !uid) {
      return;
    }

    if (loadedUidRef.current === uid) {
      return;
    }

    loadedUidRef.current = uid;

    let active = true;
    beginLoad();

    loadScenarioState(uid, SCENARIO_ID).then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        loadFailed(result.message);
        return;
      }

      const saved = result.data;

      savedStepRef.current = saved.currentStep;
      completedRef.current = saved.completed;
      loadSucceeded(saved.currentStep, saved.completed);

      // Only move the user if the saved position differs from where the
      // app currently is. Setting the same screen would be a no-op render
      // but is skipped anyway to keep the intent obvious.
      if (resume && saved.currentStep !== screenToStep(currentScreen)) {
        setCurrentScreen(stepToScreen(saved.currentStep));
      }
    });

    return () => {
      active = false;

      // React 18/19 StrictMode mounts, unmounts and remounts effects in
      // development. Without this, the first run would be discarded while
      // loadedUidRef still blocked the second, leaving status stuck on
      // 'loading' forever in dev.
      if (
        loadedUidRef.current === uid &&
        useScenarioProgressState.getState().status === 'loading'
      ) {
        loadedUidRef.current = null;
      }
    };
    // currentScreen is read, not tracked: including it would re-run the
    // load every time the user changes screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, uid, resume, retryToken, beginLoad, loadSucceeded, loadFailed, setCurrentScreen]);

  // -----------------------------
  // 2. Save on step change  3. Mark completed
  // -----------------------------

  useEffect(() => {
    if (!enabled || !uid) {
      return;
    }

    // Never write before the read has finished. Saving first would push
    // the app's default 'overview' over a real saved step.
    if (status !== 'ready') {
      return;
    }

    const step = screenToStep(currentScreen);

    if (savedStepRef.current === step) {
      return;
    }

    const reachedEnd = step === FINAL_STEP;
    const nextCompleted = completedRef.current || reachedEnd;

    // Claim the step immediately. Two rapid transitions must not both fire
    // a write for the same value.
    savedStepRef.current = step;
    completedRef.current = nextCompleted;

    let active = true;
    beginSave();

    const write = reachedEnd
      ? markScenarioCompleted(uid, SCENARIO_ID)
      : saveScenarioState(uid, SCENARIO_ID, step, nextCompleted);

    write.then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        saveSucceeded(step, nextCompleted);
        return;
      }

      // Release the claim so a later navigation retries the write.
      savedStepRef.current = null;
      saveFailed(result.message);
    });

    return () => {
      active = false;
    };
  }, [enabled, uid, status, currentScreen, beginSave, saveSucceeded, saveFailed]);

  // -----------------------------
  // 3. Clear refs when the user changes
  // -----------------------------

  useEffect(() => {
    if (uid) {
      return;
    }
    loadedUidRef.current = null;
    savedStepRef.current = null;
    completedRef.current = false;
  }, [uid]);

  return { status, saving, lastError, completed, retry };
}
