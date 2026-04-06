"""
Combat — adversarial red team agents that stress-test each solution.
Returns both the scored Solution and a structured CombatEntry for the log.
Agents never see the log — it is populated after their work is done.
"""

import json
from dataclasses import dataclass
from backend.llm.adapter import LLMAdapter
from backend.core.population import Solution
from backend.report.log import AttackEntry, CombatEntry, ScoreEntry


@dataclass
class Attacker:
    name: str
    system_prompt: str


ATTACKERS: list[Attacker] = [
    Attacker(
        name="Devil's Advocate",
        system_prompt=(
            "You are a devil's advocate. Find the single strongest argument against this solution. "
            "Do not nitpick — find the fundamental flaw that would cause it to fail completely."
        ),
    ),
    Attacker(
        name="Skeptical User",
        system_prompt=(
            "You are a skeptical end user who has seen many overpromised solutions. "
            "What would make you refuse to adopt this? What is the hidden friction or cost "
            "that the proposer hasn't accounted for?"
        ),
    ),
    Attacker(
        name="Resource Realist",
        system_prompt=(
            "You are a pragmatic implementer with limited time, budget, and people. "
            "What would make this solution impossible or prohibitively expensive to actually build? "
            "Identify the resource assumptions that are unrealistic."
        ),
    ),
]


SCORER_SYSTEM = """
You are an objective evaluator. Given a solution and the red team attacks against it,
score the solution from 0 to 10 across three dimensions:
- Novelty (0-10): How original is this compared to conventional approaches?
- Feasibility (0-10): How realistic is it to actually implement?
- Robustness (0-10): How well does it hold up against the attacks?

Return ONLY a JSON object in this exact format:
{"novelty": <int>, "feasibility": <int>, "robustness": <int>, "summary": "<one sentence verdict>"}
"""


async def run_combat(solution: Solution, problem: str, llm: LLMAdapter) -> tuple[Solution, CombatEntry]:
    attack_entries: list[AttackEntry] = []

    for attacker in ATTACKERS:
        content = await llm.complete(
            system=attacker.system_prompt,
            user=f"Problem: {problem}\n\nProposed solution:\n{solution.content}",
            temperature=0.8,
        )
        attack_entries.append(AttackEntry(attacker=attacker.name, content=content))

    attacks_text = "\n\n".join(f"[{a.attacker}]: {a.content}" for a in attack_entries)

    score_raw = await llm.complete(
        system=SCORER_SYSTEM,
        user=(
            f"Problem: {problem}\n\n"
            f"Solution:\n{solution.content}\n\n"
            f"Red team attacks:\n{attacks_text}"
        ),
        temperature=0.2,
    )

    try:
        cleaned = score_raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        scores = json.loads(cleaned)
        novelty = scores.get("novelty", 5)
        feasibility = scores.get("feasibility", 5)
        robustness = scores.get("robustness", 5)
        verdict = scores.get("summary", "")
        solution.fitness_score = (novelty + feasibility + robustness) / 3
    except (json.JSONDecodeError, KeyError):
        novelty = feasibility = robustness = 5
        verdict = "Scoring failed — defaulted to 5"
        solution.fitness_score = 5.0

    score_entry = ScoreEntry(
        novelty=novelty,
        feasibility=feasibility,
        robustness=robustness,
        average=solution.fitness_score,
        verdict=verdict,
    )

    combat_entry = CombatEntry(
        solution_id=solution.id,
        attacks=attack_entries,
        score=score_entry,
    )

    return solution, combat_entry
