"""
Report generator — writes the full evolution log incrementally to disk.
Each event (seed, combat, evolution) is appended immediately so nothing
is lost if the run crashes mid-way.
"""

from pathlib import Path
from datetime import datetime
from backend.core.population import Population
from backend.report.log import RunLog, SeedEntry, CombatEntry, EvolutionEntry


def init_report(problem: str, generations: int, output_dir: str = "reports") -> Path:
    """Create the report file and write the header. Called once at run start."""
    reports_dir = Path(output_dir)
    reports_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = reports_dir / f"cambrian_{timestamp}.md"

    lines = [
        "# Cambrian Run Report",
        "",
        f"**Problem:** {problem}",
        f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"**Generations:** {generations}",
        "",
        "---",
        "",
    ]
    path.write_text("\n".join(lines))
    return path


def append_seed(path: Path, entry: SeedEntry) -> None:
    """Append a seed idea immediately after it is generated."""
    lines = [
        f"## Generation {entry.generation}",
        "",
        f"### [{entry.solution_id}] — {entry.phenotype}",
        "",
        entry.content,
        "",
    ]
    _append(path, lines)


def append_combat(path: Path, entry: CombatEntry) -> None:
    """Append red team attacks and scores immediately after combat."""
    outcome = "✅ Survived" if entry.survived else "❌ Eliminated"
    lines = ["#### Red Team Attacks", ""]
    for attack in entry.attacks:
        lines += [f"**{attack.attacker}**", "", attack.content, ""]
    lines += [
        "#### Fitness Score",
        "",
        "| Dimension | Score |",
        "|---|---|",
        f"| Novelty | {entry.score.novelty}/10 |",
        f"| Feasibility | {entry.score.feasibility}/10 |",
        f"| Robustness | {entry.score.robustness}/10 |",
        f"| **Average** | **{entry.score.average:.1f}/10** |",
        "",
        f"**Verdict:** {entry.score.verdict}",
        "",
        f"**Outcome:** {outcome}",
        "",
        "---",
        "",
    ]
    _append(path, lines)


def append_evolution(path: Path, entry: EvolutionEntry) -> None:
    """Append evolution reasoning immediately after crossover or mutation."""
    if entry.type == "crossover":
        parents = " × ".join(f"`{p}`" for p in entry.parent_ids)
        lines = [
            f"### Evolution → Generation {entry.generation}",
            "",
            f"**Crossover:** {parents} → `{entry.child_id}`",
            "",
            f"*Synthesis reasoning:* {entry.reasoning}",
            "",
        ]
    else:
        lines = [
            f"### Evolution → Generation {entry.generation}",
            "",
            f"**Mutation:** `{entry.parent_ids[0]}` → `{entry.child_id}`",
            "",
            f"*Assumption challenged:* {entry.reasoning}",
            "",
        ]
    _append(path, lines)


def append_final(path: Path, population: Population) -> None:
    """Append the final top solutions at the end of the run."""
    lines = [
        "---",
        "",
        "## Final Results — Top 5 Evolved Solutions",
        "",
    ]
    for i, solution in enumerate(population.top(5), 1):
        lines += [
            f"### #{i} — {solution.lineage_label()} (score: {solution.fitness_score:.1f}/10)",
            "",
            solution.content,
            "",
            "---",
            "",
        ]
    _append(path, lines)


def _append(path: Path, lines: list) -> None:
    with path.open("a") as f:
        f.write("\n".join(lines) + "\n")
