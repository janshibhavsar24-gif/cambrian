"""
Population — represents a solution and tracks its lineage across generations.
"""

from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class Solution:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    phenotype: Optional[str] = None          # which cognitive type produced it
    parent_ids: list[str] = field(default_factory=list)  # empty = generation 1
    generation: int = 1
    fitness_score: float = 0.0               # 0–10, set after combat phase
    combat_notes: str = ""                   # red team feedback
    survived: bool = True

    @property
    def is_hybrid(self) -> bool:
        return len(self.parent_ids) > 1

    def lineage_label(self) -> str:
        if not self.parent_ids:
            return self.phenotype or "seed"
        return f"cross({', '.join(self.parent_ids)})"


@dataclass
class Population:
    solutions: list[Solution] = field(default_factory=list)

    def add(self, solution: Solution) -> None:
        self.solutions.append(solution)

    def survivors(self) -> list[Solution]:
        return [s for s in self.solutions if s.survived]

    def top(self, n: int = 5) -> list[Solution]:
        return sorted(self.survivors(), key=lambda s: s.fitness_score, reverse=True)[:n]

    def cull(self, keep_top: int = 10) -> None:
        ranked = sorted(self.solutions, key=lambda s: s.fitness_score, reverse=True)
        survivors = set(s.id for s in ranked[:keep_top])
        for s in self.solutions:
            if s.id not in survivors:
                s.survived = False

    def all_generations(self) -> dict[int, list[Solution]]:
        result: dict[int, list[Solution]] = {}
        for s in self.solutions:
            result.setdefault(s.generation, []).append(s)
        return result
