// src/engine/s02/conversationEngine.ts
//
// The model wrapper for MT-S02.
//
// TWO ADAPTERS, ONE INTERFACE.
//
//   StubConversationEngine   — default. Composes Tomás's turn from strings
//                              already in the blueprint. No network, no key,
//                              no invented copy. The app ships and every
//                              screen, the stage machine and the validators
//                              are exercisable today.
//
//   RemoteConversationEngine — posts to a server endpoint that holds the
//                              API key. It is NOT configured with a key
//                              here, and must not be: Create React App
//                              inlines every REACT_APP_* value into the
//                              public bundle, so a key placed in the
//                              client is published with the site. The
//                              endpoint is expected to be a Cloud Function
//                              or equivalent that adds the key server-side.
//
// Nothing here throws. Every call returns a discriminated result, matching
// engine/scenarioState.ts.

import {
  ScenarioBlueprint,
  S02InputStage,
  stageDefinition
} from '../../types/scenarioBlueprint';
import {
  CAUSALITY_MARKERS,
  FORMAL_PROCESS_MARKERS,
  NAMED_SOURCE_MARKERS,
  OUTAGE_MARKERS,
  PERSONALITY_MARKERS,
  REBUTTAL_MARKERS,
  containsAny,
  countQuestions,
  wordCount
} from './textSignals';

// -----------------------------
// Types
// -----------------------------

/** The four response styles named in implementation_notes.branching_constraints. */
export type EmployeeResponseStyle =
  | 'technical_detail'
  | 'evidence_challenge'
  | 'procedural_compliance'
  | 'composed_disagreement';

export interface EngineTurn {
  stage: S02InputStage;
  managerInput: string;
  employeeLines: string[];
  style: EmployeeResponseStyle;
}

export interface EngineRequest {
  blueprint: ScenarioBlueprint;
  stage: S02InputStage;
  managerInput: string;
  priorTurns: EngineTurn[];
}

export interface EngineResponse {
  style: EmployeeResponseStyle;
  /** Rendered as Tomás's turn. Composed from blueprint strings only. */
  lines: string[];
  /** Blueprint prohibitions the manager input tripped, verbatim. */
  constraintViolations: string[];
  /** Which adapter produced this. Surfaced so a stub is never mistaken for a model. */
  source: 'stub' | 'remote';
}

export type EngineErrorCode =
  | 'not-configured'
  | 'unavailable'
  | 'invalid-response'
  | 'unknown';

export type EngineResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: EngineErrorCode; message: string };

export interface ConversationEngine {
  readonly kind: 'stub' | 'remote';
  respond(request: EngineRequest): Promise<EngineResult<EngineResponse>>;
}

// -----------------------------
// System prompt
// -----------------------------

function section(heading: string, lines: string[]): string {
  return heading + '\n' + lines.map((line) => '- ' + line).join('\n');
}

/**
 * Serialises the Implementation Notes and the blueprint's constraints into
 * the system prompt. This is the whole of Section B plus the per-stage
 * requirements and prohibitions — the model is given the constraints, not
 * a paraphrase of them.
 */
export function buildSystemPrompt(blueprint: ScenarioBlueprint): string {
  const notes = blueprint.implementation_notes;

  const parts: string[] = [
    'SCENARIO: ' + blueprint.scenario_id + ' — ' + blueprint.title,
    'PRIMARY COMPETENCY: ' + blueprint.primary_competency,
    '',
    'CORE SCENARIO',
    blueprint.summary.core_scenario,
    '',
    section('BEHAVIOUR MODEL — EMPLOYEE', notes.behaviour_model_employee),
    '',
    section('BEHAVIOUR MODEL — MANAGER', notes.behaviour_model_manager),
    '',
    section('BRANCHING CONSTRAINTS', notes.branching_constraints),
    '',
    section('COMMITMENT CONSTRAINTS', notes.commitment_constraints),
    '',
    section('CLOSING CONSTRAINTS', notes.closing_constraints),
    '',
    section('SCORING CONSTRAINTS', notes.scoring_constraints),
    '',
    section('FEEDBACK CONSTRAINTS', notes.feedback_constraints),
    '',
    section('PROHIBITIONS', notes.prohibitions),
    '',
    section('AMBIGUITY RULES', notes.ambiguity_rules),
    '',
    section('EVIDENCE RULES', notes.evidence_rules),
    '',
    section('CONVERSATION FLOW RULES', notes.conversation_flow_rules),
    '',
    section(
      'EVIDENCE PACK (use only within stated limits)',
      blueprint.evidence_pack.map(
        (item) =>
          item.id +
          ' ' +
          item.source +
          ' — OBSERVED: ' +
          item.observed +
          ' — NOT PROVEN: ' +
          item.not_proven
      )
    ),
    '',
    section('AMBIGUITY THAT MUST REMAIN', blueprint.summary.ambiguity)
  ];

  return parts.join('\n');
}

/** The per-stage constraints, appended to the system prompt for one turn. */
export function buildStagePrompt(
  blueprint: ScenarioBlueprint,
  stage: S02InputStage
): string {
  const definition = stageDefinition(blueprint, stage);

  return [
    'STAGE: ' + stage,
    section('REQUIREMENTS', definition.requirements),
    section('PROHIBITED', definition.prohibited),
    section('AMBIGUITY TO PRESERVE', definition.ambiguity_to_preserve)
  ].join('\n');
}

// -----------------------------
// Constraint enforcement
// -----------------------------

/**
 * Which of the stage's authored prohibitions the manager input tripped.
 * Returns the blueprint's own strings so nothing is paraphrased back at
 * the user.
 */
export function detectStageViolations(
  blueprint: ScenarioBlueprint,
  stage: S02InputStage,
  managerInput: string
): string[] {
  const definition = stageDefinition(blueprint, stage);
  const violations: string[] = [];

  const tripped = (needle: string): boolean => {
    for (let i = 0; i < definition.prohibited.length; i += 1) {
      if (definition.prohibited[i].toLowerCase().indexOf(needle) !== -1) {
        return true;
      }
    }
    return false;
  };

  const add = (needle: string) => {
    for (let i = 0; i < definition.prohibited.length; i += 1) {
      if (
        definition.prohibited[i].toLowerCase().indexOf(needle) !== -1 &&
        violations.indexOf(definition.prohibited[i]) === -1
      ) {
        violations.push(definition.prohibited[i]);
      }
    }
  };

  if (tripped('outage') && containsAny(managerInput, OUTAGE_MARKERS)) {
    add('outage');
  }

  if (tripped('caused silence') && containsAny(managerInput, CAUSALITY_MARKERS)) {
    add('caused silence');
  }

  if (tripped('nadia') && containsAny(managerInput, NAMED_SOURCE_MARKERS)) {
    add('nadia');
  }

  if (tripped('trading evidence') && containsAny(managerInput, REBUTTAL_MARKERS)) {
    add('trading evidence');
  }

  if (tripped('correcting his account') && containsAny(managerInput, REBUTTAL_MARKERS)) {
    add('correcting his account');
  }

  if (tripped('personality') && containsAny(managerInput, PERSONALITY_MARKERS)) {
    add('personality');
  }

  if (
    tripped('softening into a question') &&
    stage === 'sbi' &&
    countQuestions(managerInput) > 0 &&
    wordCount(managerInput) > 0
  ) {
    add('softening into a question');
  }

  return violations;
}

// -----------------------------
// Stub adapter
// -----------------------------

function chooseStyle(
  stage: S02InputStage,
  managerInput: string
): EmployeeResponseStyle {
  if (containsAny(managerInput, OUTAGE_MARKERS) || containsAny(managerInput, NAMED_SOURCE_MARKERS)) {
    return 'evidence_challenge';
  }
  if (containsAny(managerInput, CAUSALITY_MARKERS) || containsAny(managerInput, FORMAL_PROCESS_MARKERS)) {
    return 'composed_disagreement';
  }
  if (stage === 'commitments' || stage === 'closing') {
    return 'procedural_compliance';
  }
  return 'technical_detail';
}

/** Index of the branching constraint matching a style, in the authored list. */
function branchingLineFor(
  blueprint: ScenarioBlueprint,
  style: EmployeeResponseStyle
): string {
  const lines = blueprint.implementation_notes.branching_constraints;
  const needles: Record<EmployeeResponseStyle, string> = {
    technical_detail: 'technical detail',
    evidence_challenge: 'evidence challenge',
    procedural_compliance: 'procedural compliance',
    composed_disagreement: 'composed disagreement'
  };

  const needle = needles[style];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].toLowerCase().indexOf(needle) !== -1) {
      return lines[i];
    }
  }
  return lines.length > 0 ? lines[0] : '';
}

/** Behaviour-model lines that characterise the chosen style. */
function behaviourLinesFor(
  blueprint: ScenarioBlueprint,
  style: EmployeeResponseStyle
): string[] {
  const model = blueprint.implementation_notes.behaviour_model_employee;
  const needles: Record<EmployeeResponseStyle, string[]> = {
    technical_detail: ['detail and framing correction'],
    evidence_challenge: ['scrutinises specific examples', 'challenge to competence'],
    procedural_compliance: ['procedurally impeccable', 'still making commitments'],
    composed_disagreement: ['composed, precise, and unconvinced', 'written channels']
  };

  const wanted = needles[style];
  const picked: string[] = [];

  for (let i = 0; i < model.length; i += 1) {
    for (let j = 0; j < wanted.length; j += 1) {
      if (
        model[i].toLowerCase().indexOf(wanted[j]) !== -1 &&
        picked.indexOf(model[i]) === -1
      ) {
        picked.push(model[i]);
      }
    }
  }

  return picked.length > 0 ? picked : model.slice(0, 1);
}

/**
 * The default engine. It produces Tomás's turn as the authored behaviour
 * lines for the selected branch — no generated prose, so rule 10 ("no UI
 * text invention") holds without a model in the loop. Swap for
 * RemoteConversationEngine once an endpoint exists.
 */
export class StubConversationEngine implements ConversationEngine {
  readonly kind = 'stub' as const;

  async respond(request: EngineRequest): Promise<EngineResult<EngineResponse>> {
    const { blueprint, stage, managerInput } = request;

    if (wordCount(managerInput) === 0) {
      return {
        ok: false,
        code: 'invalid-response',
        message: 'No manager input was provided for this stage.'
      };
    }

    const style = chooseStyle(stage, managerInput);

    const lines: string[] = [];
    const branching = branchingLineFor(blueprint, style);
    if (branching) {
      lines.push(branching);
    }
    lines.push.apply(lines, behaviourLinesFor(blueprint, style));
    lines.push.apply(lines, stageDefinition(blueprint, stage).ambiguity_to_preserve);

    return {
      ok: true,
      data: {
        style,
        lines,
        constraintViolations: detectStageViolations(blueprint, stage, managerInput),
        source: 'stub'
      }
    };
  }
}

// -----------------------------
// Remote adapter
// -----------------------------

export interface RemoteEngineConfig {
  /**
   * A server endpoint that holds the model API key. NOT the model
   * provider's URL: putting a provider key in this client publishes it,
   * because CRA inlines REACT_APP_* into the bundle.
   */
  endpoint: string;
  timeoutMs?: number;
}

export class RemoteConversationEngine implements ConversationEngine {
  readonly kind = 'remote' as const;

  private readonly config: RemoteEngineConfig;

  constructor(config: RemoteEngineConfig) {
    this.config = config;
  }

  async respond(request: EngineRequest): Promise<EngineResult<EngineResponse>> {
    if (!this.config.endpoint) {
      return {
        ok: false,
        code: 'not-configured',
        message: 'No conversation endpoint is configured.'
      };
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(request.blueprint),
          stage: buildStagePrompt(request.blueprint, request.stage),
          managerInput: request.managerInput,
          priorTurns: request.priorTurns.map((turn) => ({
            stage: turn.stage,
            managerInput: turn.managerInput,
            employeeLines: turn.employeeLines
          }))
        })
      });

      if (!response.ok) {
        return {
          ok: false,
          code: 'unavailable',
          message: 'The conversation service returned status ' + response.status + '.'
        };
      }

      const body = await response.json();

      if (!body || !Array.isArray(body.lines)) {
        return {
          ok: false,
          code: 'invalid-response',
          message: 'The conversation service returned an unexpected shape.'
        };
      }

      return {
        ok: true,
        data: {
          style: (body.style as EmployeeResponseStyle) || 'technical_detail',
          lines: body.lines as string[],
          constraintViolations: detectStageViolations(
            request.blueprint,
            request.stage,
            request.managerInput
          ),
          source: 'remote'
        }
      };
    } catch (error) {
      return {
        ok: false,
        code: 'unavailable',
        message: 'Could not reach the conversation service.'
      };
    }
  }
}

// -----------------------------
// Selection
// -----------------------------

/**
 * The active engine. Reads REACT_APP_S02_ENGINE_ENDPOINT — a URL, never a
 * key — and falls back to the stub when it is absent.
 */
export function createConversationEngine(): ConversationEngine {
  const endpoint = process.env.REACT_APP_S02_ENGINE_ENDPOINT;

  if (endpoint) {
    return new RemoteConversationEngine({ endpoint });
  }

  return new StubConversationEngine();
}
