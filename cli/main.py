"""
Cambrian CLI — run an evolutionary idea session from the terminal.
Usage: python3 -m cli.main evolve "your problem here"
"""

import asyncio
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from dotenv import load_dotenv

load_dotenv()

from backend.core.engine import run, RunConfig, Event

app = typer.Typer(help="Cambrian — evolutionary idea engine", invoke_without_command=True)
sub = typer.Typer()
app.add_typer(sub)
console = Console()


async def _run(problem: str, generations: int) -> None:
    console.print(Panel.fit(
        f"[bold cyan]Cambrian[/bold cyan] — evolving solutions to:\n[italic]{problem}[/italic]",
        border_style="cyan"
    ))

    async def on_event(event: Event) -> None:
        if event.type == "seed" and "content" in event.data:
            console.print(
                f"  [dim]Gen {event.data['generation']} · {event.data['phenotype']}[/dim] "
                f"→ {event.data['content'][:120]}…"
            )
        elif event.type == "combat" and "fitness_score" in event.data:
            score = event.data["fitness_score"]
            color = "green" if score >= 7 else "yellow" if score >= 4 else "red"
            console.print(
                f"  [{color}]Combat[/{color}] · [{event.data['id']}] score={score:.1f}"
            )
        elif event.type == "cull":
            console.print(
                f"\n  [bold]Gen {event.data['generation']}[/bold] → "
                f"{event.data['survivors']} survived, {event.data['eliminated']} culled\n"
            )
        elif event.type == "evolve":
            console.print(
                f"  [cyan]Evolving → Gen {event.data['generation']}[/cyan] "
                f"({event.data['offspring']} offspring)\n"
            )
        elif event.type == "done":
            table = Table(title="Top Evolved Solutions", border_style="cyan", show_lines=True)
            table.add_column("Rank", style="bold", width=6)
            table.add_column("Score", width=7)
            table.add_column("Lineage", width=20)
            table.add_column("Solution")

            for i, sol in enumerate(event.data["top_solutions"], 1):
                table.add_row(
                    str(i),
                    f"{sol['score']:.1f}",
                    sol["lineage"],
                    sol["content"][:300] + ("…" if len(sol["content"]) > 300 else ""),
                )
            console.print(table)

    config = RunConfig(problem=problem, generations=generations)
    population, log, report_path = await run(config, on_event)

    console.print(f"\n  [bold green]Full report saved →[/bold green] {report_path}\n")


@app.command("evolve")
def evolve(
    problem: str = typer.Argument(..., help="The problem to evolve solutions for"),
    generations: int = typer.Option(3, "--generations", "-g", help="Number of generations (default: 3)"),
) -> None:
    asyncio.run(_run(problem, generations))




if __name__ == "__main__":
    app()
