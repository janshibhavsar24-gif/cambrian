export type EventType = "seed" | "combat" | "cull" | "evolve" | "done" | "report" | "error";

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

// Node in the evolutionary tree
export interface TreeNode {
  id: string;
  label: string;
  generation: number;
  score: number;
  survived: boolean;
  children: TreeNode[];
}
