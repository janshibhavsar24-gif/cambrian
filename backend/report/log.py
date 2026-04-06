"""
RunLog — passive observer that records everything that happens during a Cambrian run.
Never fed back into any agent prompt. Read-only from the agents' perspective.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class AttackEntry:
    attacker: str
    content: str


@dataclass
class ScoreEntry:
    novelty: int
    feasibility: int
    robustness: int
    average: float
    verdict: str


@dataclass
class CombatEntry:
    solution_id: str
    attacks: list[AttackEntry]
    score: ScoreEntry
    survived: bool = False


@dataclass
class EvolutionEntry:
    type: str           # "crossover" | "mutation"
    parent_ids: list[str]
    child_id: str
    reasoning: str
    generation: int     # generation the child belongs to


@dataclass
class SeedEntry:
    solution_id: str
    phenotype: str
    content: str
    generation: int


@dataclass
class RunLog:
    problem: str
    generations: int
    started_at: datetime = field(default_factory=datetime.now)
    seeds: list[SeedEntry] = field(default_factory=list)
    combat: list[CombatEntry] = field(default_factory=list)
    evolution: list[EvolutionEntry] = field(default_factory=list)

    def add_seed(self, solution_id: str, phenotype: str, content: str, generation: int) -> None:
        self.seeds.append(SeedEntry(solution_id, phenotype, content, generation))

    def add_combat(self, entry: CombatEntry) -> None:
        self.combat.append(entry)

    def add_evolution(self, entry: EvolutionEntry) -> None:
        self.evolution.append(entry)

    def combat_for(self, solution_id: str) -> Optional[CombatEntry]:
        return next((c for c in self.combat if c.solution_id == solution_id), None)
