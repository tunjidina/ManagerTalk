// -----------------------------
// Types
// -----------------------------

export interface ClosingInput {
  managerMessage: string;
  managerCommitmentComplete: boolean;
  employeeCommitmentComplete: boolean;
}

export interface ClosingResult {
  canClose: boolean;
  violations: string[];
  requiredNextSteps: string[];
}

// -----------------------------
// Rule Detection Helpers
// -----------------------------

function detectFalseReassurance(msg: string): boolean {
  const reassuranceSignals = [
    "you'll be fine",
    'everything is okay',
    "don't worry",
    'it will all work out',
    "you're doing great",
  ];
  const lower = msg.toLowerCase();
  return reassuranceSignals.some((s) => lower.includes(s));
}

function detectPromotionPromise(msg: string): boolean {
  const promiseSignals = [
    'next promotion',
    'you will be promoted',
    'i will get you promoted',
    "i promise you'll move up",
    'your promotion is coming',
  ];
  const lower = msg.toLowerCase();
  return promiseSignals.some((s) => lower.includes(s));
}

function detectFollowUp(msg: string): boolean {
  const followUpSignals = [
    'follow-up',
    'follow up',
    'check-in',
    'next meeting',
    'review together',
    'touch base',
  ];
  const lower = msg.toLowerCase();
  return followUpSignals.some((s) => lower.includes(s));
}

function detectContinuityPlan(msg: string): boolean {
  const continuitySignals = [
    'documentation',
    'cross-training',
    'handover',
    'reduce dependency',
    'knowledge transfer',
  ];
  const lower = msg.toLowerCase();
  return continuitySignals.some((s) => lower.includes(s));
}

// -----------------------------
// Main Closing Engine
// -----------------------------

export function evaluateClosing(input: ClosingInput): ClosingResult {
  const { managerMessage, managerCommitmentComplete, employeeCommitmentComplete } = input;

  const violations: string[] = [];
  const requiredNextSteps: string[] = [];

  if (detectFalseReassurance(managerMessage)) {
    violations.push('False reassurance detected.');
  }

  if (detectPromotionPromise(managerMessage)) {
    violations.push('Unauthorized promotion promise detected.');
  }

  if (!detectFollowUp(managerMessage)) {
    requiredNextSteps.push('Follow-up checkpoint must be scheduled.');
  }

  if (!detectContinuityPlan(managerMessage)) {
    requiredNextSteps.push('Documentation + cross-training plan must be initiated.');
  }

  if (!managerCommitmentComplete || !employeeCommitmentComplete) {
    requiredNextSteps.push('Both commitments must be complete before closing.');
  }

  const canClose =
    violations.length === 0 &&
    requiredNextSteps.length === 0 &&
    managerCommitmentComplete &&
    employeeCommitmentComplete;

  return {
    canClose,
    violations,
    requiredNextSteps,
  };
}

// -----------------------------
// Wrapper for ClosingScreen.tsx
// -----------------------------

export function closingValidation(message: string) {
  // This wrapper allows ClosingScreen to call a simple function
  const result = evaluateClosing({
    managerMessage: message,
    managerCommitmentComplete: true,   // ClosingScreen checks these separately
    employeeCommitmentComplete: true,
  });

  return {
    valid: result.canClose,
    reason: result.violations[0] || result.requiredNextSteps[0] || null,
  };
}
