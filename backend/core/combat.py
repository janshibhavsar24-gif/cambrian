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
You are a calibrated evaluator. Score the solution on three dimensions using the full 0-10 range.

NOVELTY (0-10) — how original is this vs conventional approaches?
  0-2: Restates the obvious. Everyone already does this.
  3-4: Minor twist on a known approach.
  5-6: Meaningfully different framing or mechanism.
  7-8: Genuinely surprising angle most people wouldn't reach.
  9-10: Paradigm-shifting. Changes how the problem is understood.

FEASIBILITY (0-10) — how realistic is it to actually implement?
  0-2: Requires things that don't exist or can't be built.
  3-4: Technically possible but wildly expensive or slow.
  5-6: Buildable with real effort and some risk.
  7-8: Clear implementation path with manageable costs.
  9-10: Could start tomorrow with existing tools.

ROBUSTNESS (0-10) — how well does it survive the red team attacks?
  0-2: Collapses under the first objection.
  3-4: Has a fatal flaw the solution doesn't address.
  5-6: Holds up to most attacks with some weaknesses.
  7-8: Addresses the core objections directly.
  9-10: Anticipates and neutralises every major attack.

Use the full range. Do not cluster around 5. A truly weak solution should score 2-3. A strong one should score 7-8.

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
