"""
Evolution — crossover and mutation of surviving solutions.
Returns both the child Solution and an EvolutionEntry for the log.
The reasoning is captured but never fed back to agents.
"""

import random
from backend.llm.adapter import LLMAdapter
from backend.core.population import Solution
from backend.report.log import EvolutionEntry


CROSSOVER_SYSTEM = """
You are a synthesis agent. You will be given two different solutions to the same problem.
Your job is NOT to pick the better one or average them — find the hidden synthesis.
Look for the deeper principle that both solutions are circling around but neither fully captures.
Produce a NEW solution that is stronger than either parent. Be specific and concrete.
"""

MUTATION_SYSTEM = """
You are a mutation agent. You will be given a solution to a problem.
Your job is to challenge ONE core assumption in that solution and explore what happens.
Pick the assumption that, if wrong, would change the solution most dramatically.
Produce a mutated variant that takes that challenge seriously. Be specific and concrete.
"""

CROSSOVER_REASONING_SYSTEM = """
In one sentence, explain what deeper principle you found that connected the two solutions.
"""

MUTATION_REASONING_SYSTEM = """
In one sentence, state which assumption you challenged and why you chose that one.
"""


async def crossover(
    parent_a: Solution, parent_b: Solution, problem: str, generation: int, llm: LLMAdapter
) -> tuple[Solution, EvolutionEntry]:
    user_prompt = (
        f"Problem: {problem}\n\n"
        f"Solution A ({parent_a.lineage_label()}):\n{parent_a.content}\n\n"
        f"Solution B ({parent_b.lineage_label()}):\n{parent_b.content}"
    )

    content = await llm.complete(system=CROSSOVER_SYSTEM, user=user_prompt, temperature=0.95)
    reasoning = await llm.complete(system=CROSSOVER_REASONING_SYSTEM, user=user_prompt, temperature=0.3)

    child = Solution(
        content=content,
        phenotype="crossover",
        parent_ids=[parent_a.id, parent_b.id],
        generation=generation,
    )
    entry = EvolutionEntry(
        type="crossover",
        parent_ids=[parent_a.id, parent_b.id],
        child_id=child.id,
        reasoning=reasoning,
        generation=generation,
    )
    return child, entry


async def mutate(
    parent: Solution, problem: str, generation: int, llm: LLMAdapter
) -> tuple[Solution, EvolutionEntry]:
    user_prompt = f"Problem: {problem}\n\nSolution to mutate:\n{parent.content}"

    content = await llm.complete(system=MUTATION_SYSTEM, user=user_prompt, temperature=1.0)
    reasoning = await llm.complete(system=MUTATION_REASONING_SYSTEM, user=user_prompt, temperature=0.3)

    child = Solution(
        content=content,
        phenotype="mutation",
        parent_ids=[parent.id],
        generation=generation,
    )
    entry = EvolutionEntry(
        type="mutation",
        parent_ids=[parent.id],
        child_id=child.id,
        reasoning=reasoning,
        generation=generation,
    )
    return child, entry


async def evolve(
    survivors: list[Solution], problem: str, generation: int, llm: LLMAdapter
) -> tuple[list[Solution], list[EvolutionEntry]]:
    offspring: list[Solution] = []
    entries: list[EvolutionEntry] = []

    if len(survivors) < 2:
        return offspring, entries

    pool = survivors.copy()
    random.shuffle(pool)
    pairs = [(pool[i], pool[i + 1]) for i in range(0, len(pool) - 1, 2)]
    for a, b in pairs:
        child, entry = await crossover(a, b, problem, generation, llm)
        offspring.append(child)
        entries.append(entry)

    top_two = sorted(survivors, key=lambda s: s.fitness_score, reverse=True)[:2]
    for parent in top_two:
        child, entry = await mutate(parent, problem, generation, llm)
        offspring.append(child)
        entries.append(entry)

    return offspring, entries
