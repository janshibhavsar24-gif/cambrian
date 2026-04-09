"""
Engine — orchestrates a full Cambrian run across N generations.
Writes to the report file incrementally after every event so nothing
is lost if the run crashes mid-way.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Callable, Awaitable, Optional
from pathlib import Path
from backend.llm.adapter import LLMAdapter
from backend.core.phenotypes import PHENOTYPES
from backend.core.population import Population, Solution
from backend.core.combat import run_combat
from backend.core.evolution import evolve
from backend.report.log import RunLog
from backend.report import generator

CONCURRENCY = 2


@dataclass
class RunConfig:
    problem: str
    generations: int = 3
    seeds_per_phenotype: int = 1
    survivors_per_gen: int = 8


@dataclass
class Event:
    type: str
    data: dict = field(default_factory=dict)


EventCallback = Callable[[Event], Awaitable[None]]


async def _throttled(sem: asyncio.Semaphore, coro):
    async with sem:
        return await coro


async def run(config: RunConfig, on_event: EventCallback, pause_event: Optional[asyncio.Event] = None) -> tuple[Population, RunLog, Path]:
    llm = LLMAdapter()
    population = Population()
    log = RunLog(problem=config.problem, generations=config.generations)
    sem = asyncio.Semaphore(CONCURRENCY)
    current_gen: list[Solution] = []

    # Open the report file immediately — every event appends to it
    report_path = generator.init_report(config.problem, config.generations)

    # ── Generation 1: Seeding ──────────────────────────────────────────────
    await on_event(Event("seed", {"generation": 1, "status": "starting"}))

    seed_tasks = [
        _throttled(sem, _generate_seed(p, config.problem, llm))
        for p in PHENOTYPES
        for _ in range(config.seeds_per_phenotype)
    ]
    seeds = await asyncio.gather(*seed_tasks)
    for solution in seeds:
        population.add(solution)
        current_gen.append(solution)
        log.add_seed(solution.id, solution.phenotype, solution.content, generation=1)
        seed_entry = log.seeds[-1]
        generator.append_seed(report_path, seed_entry)
        await on_event(Event("seed", {
            "id": solution.id,
            "phenotype": solution.phenotype,
            "content": solution.content,
            "generation": 1,
        }))

    # ── Generations 1..N: Combat → Cull → Evolve ──────────────────────────
    for gen in range(1, config.generations + 1):
        await on_event(Event("combat", {"generation": gen, "count": len(current_gen)}))

        combat_tasks = [_throttled(sem, run_combat(s, config.problem, llm)) for s in current_gen]
        results = await asyncio.gather(*combat_tasks)

        current_gen = []
        for solution, combat_entry in results:
            current_gen.append(solution)
            log.add_combat(combat_entry)
            await on_event(Event("combat", {
                "id": solution.id,
                "fitness_score": solution.fitness_score,
                "generation": gen,
            }))

        # Cull
        for s in current_gen:
            s.generation = gen
        all_ranked = sorted(current_gen, key=lambda s: s.fitness_score, reverse=True)
        survivors = all_ranked[:config.survivors_per_gen]
        eliminated = all_ranked[config.survivors_per_gen:]
        for s in eliminated:
            s.survived = False

        # Mark survival and flush combat entries to disk
        survivor_ids = {s.id for s in survivors}
        for entry in log.combat:
            if entry.solution_id in survivor_ids:
                entry.survived = True
            generator.append_combat(report_path, entry)

        await on_event(Event("cull", {
            "generation": gen,
            "survivors": len(survivors),
            "eliminated": len(eliminated),
        }))

        if gen == config.generations:
            break

        # Pause check — suspends between generations if frontend requests it
        if pause_event is not None and not pause_event.is_set():
            await on_event(Event("paused", {"generation": gen}))
            await pause_event.wait()
            await on_event(Event("resumed", {"generation": gen + 1}))

        # Evolve
        next_gen, evo_entries = await evolve(survivors, config.problem, gen + 1, llm)
        for solution in next_gen:
            population.add(solution)
            log.add_seed(solution.id, solution.phenotype, solution.content, generation=gen + 1)
            seed_entry = log.seeds[-1]
            generator.append_seed(report_path, seed_entry)
            await on_event(Event("seed", {
                "id": solution.id,
                "phenotype": solution.phenotype,
                "content": solution.content,
                "generation": gen + 1,
            }))
        for entry in evo_entries:
            log.add_evolution(entry)
            generator.append_evolution(report_path, entry)
            await on_event(Event("lineage", {
                "child_id": entry.child_id,
                "parent_ids": entry.parent_ids,
                "type": entry.type,
                "generation": entry.generation,
            }))

        await on_event(Event("evolve", {
            "generation": gen + 1,
            "offspring": len(next_gen),
        }))

        current_gen = next_gen

    # Final results
    generator.append_final(report_path, population)

    top_solutions = [
        {"id": s.id, "content": s.content, "score": s.fitness_score, "lineage": s.lineage_label()}
        for s in population.top(5)
    ]
    await on_event(Event("done", {"top_solutions": top_solutions}))

    return population, log, report_path


async def _generate_seed(phenotype, problem: str, llm: LLMAdapter) -> Solution:
    content = await llm.complete(
        system=(
            f"{phenotype.system_prompt}\n\n"
            "Propose ONE concrete, specific solution. "
            "Do not hedge or list alternatives — commit to a single approach.\n\n"
            "Your solution will be evaluated on three dimensions — address all three:\n"
            "1. NOVELTY: Explain what makes this meaningfully different from conventional approaches.\n"
            "2. FEASIBILITY: Describe concretely how this would be implemented. What are the real costs and requirements?\n"
            "3. ROBUSTNESS: Anticipate the strongest objection to your solution and address it directly.\n\n"
            "Be specific enough that someone could actually implement it."
        ),
        user=f"Problem to solve: {problem}",
        temperature=0.95,
    )
    return Solution(
        content=content,
        phenotype=phenotype.name,
        generation=1,
    )
