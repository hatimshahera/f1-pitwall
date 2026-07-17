"""f1pitwall command-line interface.

Examples
--------
    python -m f1pitwall generate-replay --year 2026 --race latest
    python -m f1pitwall generate-replay --year 2026 --race "British Grand Prix"
    python -m f1pitwall generate-replay --demo            # synthetic sample, no network
    python -m f1pitwall generate-season-index --year 2026

Podium predictions are experimental and developed in
``notebooks/podium_predictions.ipynb`` (not a CLI command).
"""

from __future__ import annotations

import typer

from f1pitwall.config import Config
from f1pitwall.exporters import write_next_race, write_replay, write_season_index
from f1pitwall.exporters.json_exporter import upsert_season_race
from f1pitwall.models import SeasonIndex
from f1pitwall.util import now_iso, slugify

app = typer.Typer(
    add_completion=False,
    help="Generate F1 replay JSON and (experimental) predictions for f1-pitwall.",
    no_args_is_help=True,
)


@app.command("generate-replay")
def generate_replay(
    year: int = typer.Option(2026, help="Season year."),
    race: str = typer.Option("latest", help="Round number, race name, or 'latest'."),
    frame_rate: float = typer.Option(10.0, help="Frames per second in the output timeline."),
    demo: bool = typer.Option(False, "--demo", help="Generate a synthetic sample (no network)."),
    update_latest: bool = typer.Option(
        True,
        "--update-latest/--no-update-latest",
        help="Also write latest-replay.json.",
    ),
) -> None:
    """Generate a race replay and write it to public-data/."""
    config = Config.load()

    if demo:
        from f1pitwall.replay.synthetic import build_synthetic_replay

        replay = build_synthetic_replay(year=year, frame_rate=frame_rate)
        path = write_replay(replay, config.public_data_dir, update_latest=update_latest)
        typer.echo(f"Wrote synthetic replay -> {path}")
        _touch_season_from_replay(replay, config)
        return

    from f1pitwall.data_sources import (
        FastF1Unavailable,
        build_replay_from_session,
        load_race_session,
        resolve_schedule,
    )

    try:
        race_ref: str | int = race
        if race == "latest":
            schedule = resolve_schedule(year, config.fastf1_cache_dir)
            if not schedule.completed:
                raise typer.BadParameter(f"No completed races found for {year}.")
            race_ref = schedule.completed[-1]["round"]
            typer.echo(f"Latest completed race: round {race_ref}")

        session = load_race_session(year, race_ref, config.fastf1_cache_dir)
        replay = build_replay_from_session(session, frame_rate=frame_rate)
        path = write_replay(replay, config.public_data_dir, update_latest=update_latest)
        typer.echo(
            f"Wrote replay ({replay.meta.race_name}, {len(replay.timeline.t)} frames) -> {path}"
        )
        _touch_season_from_replay(replay, config)
    except FastF1Unavailable as exc:
        typer.secho(f"FastF1 error: {exc}", fg=typer.colors.RED, err=True)
        typer.secho(
            "Tip: install the data extra (pip install -e '.[data]'), or use --demo for a "
            "synthetic sample.",
            fg=typer.colors.YELLOW,
            err=True,
        )
        raise typer.Exit(code=1) from exc


@app.command("generate-season-index")
def generate_season_index(
    year: int = typer.Option(2026, help="Season year."),
) -> None:
    """Build season-index.json and next-race.json from the FastF1 schedule."""
    config = Config.load()
    from f1pitwall.data_sources import FastF1Unavailable, resolve_schedule

    try:
        schedule = resolve_schedule(year, config.fastf1_cache_dir)
    except FastF1Unavailable as exc:
        typer.secho(f"FastF1 error: {exc}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from exc

    existing_slugs = _existing_replay_slugs(config)
    index = SeasonIndex(year=year, generated_at=now_iso(), races=[])
    for info in schedule.completed:
        index = upsert_season_race(
            index,
            round_number=info["round"],
            race_name=info["raceName"],
            session=info["session"],
            date=info["date"],
            has_replay=slugify(info["raceName"]) in existing_slugs,
        )
    write_season_index(index, config.public_data_dir)
    typer.echo(f"Wrote season index with {len(index.races)} completed races.")

    if schedule.next_race is not None:
        write_next_race(schedule.next_race, config.public_data_dir)
        typer.echo(f"Wrote next race: {schedule.next_race.race_name}")


def _existing_replay_slugs(config: Config) -> set[str]:
    races_dir = config.public_data_dir / "races"
    if not races_dir.exists():
        return set()
    return {p.stem for p in races_dir.glob("*.json")}


def _touch_season_from_replay(replay, config: Config) -> None:
    """Ensure the freshly generated race appears in season-index.json."""
    from f1pitwall.exporters.json_exporter import _dump  # noqa: PLC2701

    index_path = config.public_data_dir / "season-index.json"
    if index_path.exists():
        import json

        raw = json.loads(index_path.read_text(encoding="utf-8"))
        index = SeasonIndex.model_validate(raw)
    else:
        index = SeasonIndex(year=replay.meta.year, generated_at=now_iso(), races=[])

    index = upsert_season_race(
        index,
        round_number=_infer_round(index, replay),
        race_name=replay.meta.race_name,
        session=replay.meta.session,
        date=None,
        has_replay=True,
    )
    index = index.model_copy(update={"generated_at": now_iso()})
    (config.public_data_dir / "season-index.json").write_text(_dump(index) + "\n", encoding="utf-8")


def _infer_round(index: SeasonIndex, replay) -> int:
    slug = slugify(replay.meta.race_name)
    for race in index.races:
        if race.slug == slug:
            return race.round
    return len(index.races) + 1


if __name__ == "__main__":
    app()
