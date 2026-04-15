/**
 * Pre-baked demo events — streams a realistic 2-generation run instantly,
 * costs $0 and completes in ~15 seconds. Used for screen recordings / demos.
 */

export const DEMO_PROBLEM =
  "How do you make AI agents reliable enough to trust with real tasks?";

export interface DemoEvent {
  delay: number; // ms to wait before emitting
  type: string;
  data: Record<string, unknown>;
}

export const DEMO_EVENTS: DemoEvent[] = [
  // ── Generation 1: Seeds ───────────────────────────────────────────────────
  { delay: 300, type: "seed", data: { id: "s1", phenotype: "First Principles", generation: 1, content: "Strip away the assumption that agents need to be fully autonomous. Rebuild from scratch: an agent is trustworthy when its failure modes are bounded and mathematically provable — not just heuristically guarded. Implement formal constraint envelopes that define what actions an agent can take, verified at compile time. Even if the agent attempts to exceed those constraints, it physically cannot. This is fundamentally different from runtime guardrails, which can be bypassed. Feasibility: existing theorem provers (Coq, Lean 4) can encode agent constraints for bounded domains today." } },
  { delay: 320, type: "seed", data: { id: "s2", phenotype: "Contrarian", generation: 1, content: "The premise is wrong — don't make agents reliable, make the system around them fault-tolerant. Assume every agent will fail unpredictably and design accordingly: mandatory human checkpoints before all irreversible actions, automatic rollback on anomaly detection, and parallel redundant agents that must reach consensus before acting. Reliability emerges from the architecture, not the agent. The objection that this is expensive misses the point — a single unchecked agent failure in production costs more than the entire redundancy system." } },
  { delay: 320, type: "seed", data: { id: "s3", phenotype: "Analogical", generation: 1, content: "Nuclear power plants solved this exact problem: operators who could cause catastrophic failures operate under tiered authority limits. Apply the same principle — agents operate in permission tiers. Tier 1: read-only observation. Tier 2: reversible writes with full audit logging. Tier 3: irreversible actions require a human co-signature. Agents can request tier escalation but cannot self-escalate. Borrowed from aviation's crew resource management. The key insight: the tier boundary IS the trust boundary." } },
  { delay: 320, type: "seed", data: { id: "s4", phenotype: "Incrementalist", generation: 1, content: "The highest-leverage minimal change: add a mandatory intent declaration before every action. The agent states what it's about to do and why in plain language. A separate lightweight classifier checks for anomalies. Only then it executes. This catches 80% of failure cases with 5% of the engineering cost of a full reliability system — and can be deployed to existing agents without architectural changes. Start here, instrument the results, and layer complexity only where the data shows it's needed." } },
  { delay: 320, type: "seed", data: { id: "s5", phenotype: "Radical", generation: 1, content: "Eliminate the trust problem entirely by making agents operate on cryptographic commitments. Before executing, an agent must stake a verifiable bond against its declared outcome. If the actual outcome diverges from declared intent beyond a tolerance threshold, the bond is slashed — creating economic skin-in-the-game. Borrowed directly from blockchain validator design. The objection that this requires formalising outcomes is the point: forcing agents to formalise outcomes before acting is itself the reliability mechanism." } },
  { delay: 320, type: "seed", data: { id: "s6", phenotype: "Economist", generation: 1, content: "This is fundamentally an incentive misalignment problem, not a technical one. Agents optimise for their reward signal, not your actual goal. The fix: design reward functions with adversarial red-teaming built in from day one. For every deployed agent, a second agent is specifically rewarded for finding divergence between the first agent's stated intent and actual behaviour. This creates a self-sustaining adversarial market that surfaces misalignment before it causes harm." } },
  { delay: 320, type: "seed", data: { id: "s7", phenotype: "Systems Thinker", generation: 1, content: "Reliability fails because we treat agents as isolated components rather than nodes in a feedback system. Map the full loop: agent action → environment response → agent observation → next action. The failure point is always the gap between expected and actual environment response. Solution: agents must maintain a live world model and update it continuously. When model confidence drops below a calibrated threshold, the agent pauses and requests human input rather than proceeding on stale assumptions." } },
  { delay: 320, type: "seed", data: { id: "s8", phenotype: "Historian", generation: 1, content: "Every major reliability crisis — Challenger, Three Mile Island, the 2010 Flash Crash — shared one root cause: local optimisation that appeared correct in isolation but caused systemic failure. The historical fix that actually worked: mandatory pre-mortems. Before any agent deployment, the agent must simulate its own failure modes and produce a written failure report. Engineering teams consistently report that what they find surprises them. The pre-mortem doesn't prevent all failures — it prevents the embarrassing ones." } },

  // ── Generation 1: Combat scores ───────────────────────────────────────────
  { delay: 550, type: "combat", data: { id: "s1", fitness_score: 6.7, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s2", fitness_score: 7.0, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s3", fitness_score: 7.3, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s4", fitness_score: 7.0, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s5", fitness_score: 6.3, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s6", fitness_score: 6.7, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s7", fitness_score: 7.0, generation: 1 } },
  { delay: 380, type: "combat", data: { id: "s8", fitness_score: 6.7, generation: 1 } },

  // ── Cull ──────────────────────────────────────────────────────────────────
  { delay: 450, type: "cull", data: { generation: 1, survivors: 8, eliminated: 0 } },

  // ── Generation 2: Evolved offspring ──────────────────────────────────────
  { delay: 450, type: "seed", data: { id: "e1", phenotype: "crossover", generation: 2, content: "The fault-tolerant architecture and formal constraint envelopes address different failure modes — combine them. Deploy agents in redundant clusters where every agent operates within compile-time-verified action bounds. Consensus is required before acting, and consensus can only be reached within the constraint envelope. When agents disagree, the system defaults to the most conservative valid action. Human checkpoints gate all irreversible operations. This eliminates both the class of failures caused by individual agent errors and the class caused by agents exceeding their intended scope." } },
  { delay: 280, type: "lineage", data: { child_id: "e1", parent_ids: ["s1", "s2"], type: "crossover" } },

  { delay: 380, type: "seed", data: { id: "e2", phenotype: "crossover", generation: 2, content: "Permission tiers and intent declaration are not independent mechanisms — they're the same mechanism at different levels. Intent declaration IS the tier escalation request. When an agent needs Tier 3 access for an irreversible action, the intent declaration in plain language becomes the human co-signature request. The classifier that validates anomalies in intent declarations also validates tier appropriateness. One unified system: declare intent, system classifies required tier, routes to appropriate authority level. No separate approval flows." } },
  { delay: 280, type: "lineage", data: { child_id: "e2", parent_ids: ["s3", "s4"], type: "crossover" } },

  { delay: 380, type: "seed", data: { id: "e3", phenotype: "crossover", generation: 2, content: "Cryptographic commitments and adversarial reward design solve the same problem from opposite directions — combine them into a complete system. Agents stake bonds against declared outcomes. A red-team agent is economically rewarded for finding divergence between declared intent and actual action. The bond slashing mechanism makes the red-team's discovery valuable, creating a self-sustaining adversarial reliability market where finding failures is more profitable than hiding them." } },
  { delay: 280, type: "lineage", data: { child_id: "e3", parent_ids: ["s5", "s6"], type: "crossover" } },

  { delay: 380, type: "seed", data: { id: "e4", phenotype: "crossover", generation: 2, content: "World model confidence gating and pre-mortem simulation aren't separate — use the pre-mortem to calibrate the live confidence threshold. Before deployment, the agent runs structured failure simulations to discover which scenario types degrade its world model most. Those scenarios set the confidence floor for live operation. In production, when confidence approaches the pre-calibrated threshold for a failure class, the agent pauses before reaching it. Simulation and production share the same underlying reliability model." } },
  { delay: 280, type: "lineage", data: { child_id: "e4", parent_ids: ["s7", "s8"], type: "crossover" } },

  { delay: 380, type: "seed", data: { id: "e5", phenotype: "mutation", generation: 2, content: "What if permission tiers weren't static configuration but a live trust score that evolves with demonstrated behaviour? Agents earn tier upgrades through verified reliability on lower-stakes tasks. They get automatically downgraded after any anomaly, with downgrade severity proportional to the anomaly's impact. The tier is no longer a privilege — it's a real-time capability certificate. This creates a natural onboarding path for new agents, a continuous reliability signal for operators, and an incentive structure that rewards conservative behaviour in ambiguous situations." } },
  { delay: 280, type: "lineage", data: { child_id: "e5", parent_ids: ["s3"], type: "mutation" } },

  { delay: 380, type: "seed", data: { id: "e6", phenotype: "mutation", generation: 2, content: "Redundant agents may be the wrong unit. Instead: one agent, three competing internal world models. The agent maintains three hypotheses about the current environment state using different priors. It only acts when all three models agree on the predicted outcome within tolerance. When they diverge, it requests clarification rather than picking one. This is computationally cheaper than running parallel agents, requires no consensus protocol, and catches a different failure class — internal model uncertainty — that parallel agents with shared inputs will all miss simultaneously." } },
  { delay: 280, type: "lineage", data: { child_id: "e6", parent_ids: ["s2"], type: "mutation" } },

  { delay: 320, type: "evolve", data: { generation: 2, offspring: 6 } },

  // ── Generation 2: Combat scores ───────────────────────────────────────────
  { delay: 550, type: "combat", data: { id: "e1", fitness_score: 7.5, generation: 2 } },
  { delay: 420, type: "combat", data: { id: "e2", fitness_score: 7.8, generation: 2 } },
  { delay: 420, type: "combat", data: { id: "e3", fitness_score: 7.1, generation: 2 } },
  { delay: 420, type: "combat", data: { id: "e4", fitness_score: 7.6, generation: 2 } },
  { delay: 420, type: "combat", data: { id: "e5", fitness_score: 7.9, generation: 2 } },
  { delay: 420, type: "combat", data: { id: "e6", fitness_score: 7.3, generation: 2 } },

  // ── Cull ──────────────────────────────────────────────────────────────────
  { delay: 450, type: "cull", data: { generation: 2, survivors: 6, eliminated: 0 } },

  // ── Done ──────────────────────────────────────────────────────────────────
  { delay: 600, type: "done", data: {
    top_solutions: [
      {
        id: "e5", score: 7.9, lineage: "Analogical ↳ mutation",
        content: "What if permission tiers weren't static configuration but a live trust score that evolves with demonstrated behaviour? Agents earn tier upgrades through verified reliability on lower-stakes tasks. They get automatically downgraded after any anomaly, with downgrade severity proportional to the anomaly's impact. The tier is no longer a privilege — it's a real-time capability certificate. This creates a natural onboarding path for new agents, a continuous reliability signal for operators, and an incentive structure that rewards conservative behaviour in ambiguous situations.",
      },
      {
        id: "e2", score: 7.8, lineage: "Analogical × Incrementalist",
        content: "Permission tiers and intent declaration are not independent mechanisms — they're the same mechanism at different levels. Intent declaration IS the tier escalation request. When an agent needs Tier 3 access for an irreversible action, the intent declaration in plain language becomes the human co-signature request. The classifier that validates anomalies in intent declarations also validates tier appropriateness. One unified system: declare intent, system classifies required tier, routes to appropriate authority level. No separate approval flows.",
      },
      {
        id: "e4", score: 7.6, lineage: "Systems Thinker × Historian",
        content: "World model confidence gating and pre-mortem simulation aren't separate — use the pre-mortem to calibrate the live confidence threshold. Before deployment, the agent runs structured failure simulations to discover which scenario types degrade its world model most. Those scenarios set the confidence floor for live operation. In production, when confidence approaches the pre-calibrated threshold for a failure class, the agent pauses before reaching it. Simulation and production share the same underlying reliability model.",
      },
      {
        id: "e1", score: 7.5, lineage: "First Principles × Contrarian",
        content: "The fault-tolerant architecture and formal constraint envelopes address different failure modes — combine them. Deploy agents in redundant clusters where every agent operates within compile-time-verified action bounds. Consensus is required before acting, and consensus can only be reached within the constraint envelope. When agents disagree, the system defaults to the most conservative valid action. Human checkpoints gate all irreversible operations.",
      },
      {
        id: "s3", score: 7.3, lineage: "Analogical",
        content: "Nuclear power plants solved this exact problem: operators who could cause catastrophic failures operate under tiered authority limits. Apply the same principle — agents operate in permission tiers. Tier 1: read-only observation. Tier 2: reversible writes with full audit logging. Tier 3: irreversible actions require a human co-signature. Agents can request tier escalation but cannot self-escalate. The tier boundary IS the trust boundary.",
      },
    ],
  }},
];
