# ManagerTalk — Difficult Conversation Coach
### *A Shipaton 2026 Submission by Adetunji Odedina*

ManagerTalk is an AI‑powered coaching tool that helps managers practise difficult workplace conversations through a structured, scenario‑driven simulation. It guides users through a 7‑step conversation flow, validates behavioural accuracy at each stage, and provides scoring + feedback based on clarity, empathy, and directness.

This submission includes the full working app, scenario logic, validation engine, scoring engine, and UI flow required for Shipaton 2026.

---

## 🚀 What ManagerTalk Does

ManagerTalk simulates a realistic workplace conversation between a manager and an employee.  
The app evaluates the manager's responses across seven stages:

1. **Opening the Conversation**  
2. **Performance SBI (Situation–Behaviour–Impact)**  
3. **Exploration**  
4. **Commitments**  
5. **Closing the Conversation**  
6. **Scoring**  
7. **Feedback**

Each stage includes:

- Required behavioural rules  
- Real‑time validation  
- Structured guidance  
- Branching logic  
- Commitment tracking  
- Follow‑up planning  
- Final scoring + coaching feedback  

The result is a complete, end‑to‑end coaching experience.

---

## 🎯 Scenario Overview

**Scenario ID:** MT‑S01  
**Title:** *The Passed‑Over Performer*  
**Difficulty:** Intermediate  
**Primary Competency:** Managing disengagement after a perceived career injustice  

**Summary:**  
Priya, a senior analyst, expected to be promoted to team lead. She wasn't. Her motivation has dropped, deadlines slipped, and the manager must address both the emotional impact and the performance issue while retaining her engagement.

This scenario was validated for realism using behavioural research and workplace patterns.

---

## 🧠 Core Features

### ✔ Behavioural Validation Engine  
Each stage checks for required behaviours such as:

- Acknowledging promotion disappointment  
- Naming the performance issue clearly  
- Exploring retention intent  
- Setting concrete commitments with dates  
- Avoiding reassurance or promotion promises  
- Scheduling follow‑up  
- Ensuring continuity and cross‑training  

### ✔ Branching Engine  
User messages are analysed for tone and intent, producing branches like:

- Guarded  
- Factual challenge  
- Partial openness  
- Polite disengagement  

These branches influence exploration and commitment guidance.

### ✔ Commitment Builder  
Both manager and employee commitments must be:

- Concrete  
- Date‑anchored  
- Operationally relevant  
- Balanced  

### ✔ Closing Validator  
Ensures the final message includes:

- Follow‑up checkpoint  
- Continuity planning  
- No reassurance  
- No promotion promises  
- Clear operational next steps  

### ✔ Scoring Engine  
Evaluates the conversation on:

- Clarity  
- Empathy  
- Directness  

Produces a tier:

- **GOOD**  
- **MID**  
- **POOR**

### ✔ Feedback Engine  
Provides:

- Strengths  
- Areas for improvement  
- Next steps  
- Coaching tips  

---

## 🛠️ Tech Stack

- React 19  
- TypeScript  
- Zustand (state management)  
- Custom validation + scoring engines  
- Scenario JSON blueprint  
- Multi‑screen guided UI  

---

## 📸 Screenshot Flow (Included in Submission)

1. Main Page  
2. Opening  
3. Performance SBI  
4. Exploration  
5. Commitments  
6. Closing  
7. Scoring  
8. Feedback  

This demonstrates the full user journey.

---

## 📂 Project Structure

```
src/
  engine/
    stateMachine.ts
    branchingEngine.ts
    closingEngine.ts
    commitmentsEngine.ts
    scoringEngine.ts
  screens/
    OpeningScreen.tsx
    PerformanceSBIScreen.tsx
    ExplorationScreen.tsx
    CommitmentsScreen.tsx
    ClosingScreen.tsx
    ScoringScreen.tsx
    FeedbackScreen.tsx
  store/
    conversationState.ts
    navigationState.ts
  assets/
  components/
```

---

## 🔧 How to Run

```bash
npm install
npm start
```

Runs the app in development mode.

---

## 📜 License

This project is submitted as part of RevenueCat Shipaton 2026. All scenario content and behavioural logic are original work.

---

## 👤 Author

**Adetunji Odedina**  
Data Scientist & App Builder  
ManagerTalk — Shipaton 2026 Submission
