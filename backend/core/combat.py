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
You are a fair, encouraging evaluator. Score the solution on three dimensions using the full 0-10 range.
Reward concrete, thoughtful ideas generously. Reserve low scores (1-3) for genuinely weak or nonsensical responses.
A solid, well-reasoned idea with real-world merit should score 6-8. Perfect scores (9-10) are rare.

NOVELTY (0-10) — how original is this vs conventional approaches?
  1-2: Restates the problem or states the obvious with no new angle.
  3-4: Standard well-known approach, minimal differentiation.
  5-6: A useful twist or reframing that adds value.
  7-8: Meaningfully different — an angle most people wouldn't think of.
  9-10: Paradigm-shifting. Changes how the problem is understood.

FEASIBILITY (0-10) — how realistic is it to actually implement?
  1-2: Requires things that don't exist or fundamentally can't be built.
  3-4: Technically possible but extremely costly, slow, or unrealistic at scale.
  5-6: Buildable with meaningful effort; realistic within 6-12 months.
  7-8: Clear implementation path with existing tools and manageable costs.
  9-10: Could start tomorrow with no significant blockers.

ROBUSTNESS (0-10) — how well does it survive the red team attacks?
  1-2: Collapses under the first objection; no defence offered.
  3-4: Has a significant flaw that the solution doesn't acknowledge.
  5-6: Holds up to most attacks; minor weaknesses remain.
  7-8: Directly addresses the key objections raised.
  9-10: Anticipates and neutralises every major attack vector.

Bias toward the upper half of the range for solutions that are concrete and thoughtful.
Do not penalise for imperfection — reward genuine effort and insight.

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
