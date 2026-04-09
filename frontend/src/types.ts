export type EventType = "seed" | "combat" | "cull" | "evolve" | "done" | "report" | "error" | "paused" | "resumed" | "lineage";

export interface CambrianEvent {
  type: EventType;
  data: Record<string, unknown>;
}

export interface SeedData {
  id: string;
  phenotype: string;
  content: string;
  generation: number;
}

export interface CombatData {
  id: string;
  fitness_score: number;
  generation: number;
}

export interface CullData {
  generation: number;
  survivors: number;
  eliminated: number;
}

export interface EvolveData {
  generation: number;
  offspring: number;
}

export interface Solution {
  id: string;
  content: string;
  score: number;
  lineage: string;
}

export interface DoneData {
  top_solutions: Solution[];
}

// ── Evolutionary tree types ────────────────────────────────────────────────

export interface VizNode {
  id: string;
  label: string;         // phenotype name or "crossover" / "mutation"
  generation: number;
  score: number;         // 0 = not yet scored
  survived: boolean;
  scored: boolean;       // false until combat result arrives
}

export interface VizEdge {
  sourceId: string;
  targetId: string;
  type: "crossover" | "mutation";
}

export interface TreeData {
  nodes: VizNode[];
  edges: VizEdge[];
}

// ── Run history ────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  problem: string;
  timestamp: number;
  generations: number;
  topScore: number;
  solutions: Solution[];
  treeData: TreeData;
}
