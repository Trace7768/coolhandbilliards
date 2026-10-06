"""Convert NAPA printable schedules into data/sessions.json.

Usage (from the repo root):
    python tools/napa_import.py monday-singles=14360 tuesday-etown-metro=14269 wednesday-bardstown=14465

Each argument is <division key>=<NAPA division ID>. The key is our permanent
name for that league night; teams in players/teams.json point at it. Each new
session, keep the key and change only the number.

Reads https://paper.playpool.io/print_schedule_web.php?did=<ID> for each
division and rewrites data/sessions.json with all of them, in the order given.

    python tools/napa_import.py --refresh

re-reads the divisions already in data/sessions.json (picks up new scores and
schedule changes). Used by the scheduled GitHub workflow.

The file is only rewritten when something actually changed.
"""

import html
import json
import re
import sys
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

SOURCE = "https://paper.playpool.io/print_schedule_web.php?did={}"
OUT = Path(__file__).resolve().parent.parent / "data" / "sessions.json"
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
HEADER_BG = {"#dddddd", "#eeeeee", "dddddd", "eeeeee"}


class RowParser(HTMLParser):
    """Collects every table row as a list of (tag, attrs, text) cells, plus H5 lines."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.h5 = [], []
        self._row = None
        self._cell = None
        self._in_h5 = False
        self._h5_text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = [tag, dict(attrs), ""]
        elif tag == "br" and self._cell is not None:
            self._cell[2] += "\n"
        elif tag == "h5":
            self._in_h5, self._h5_text = True, ""

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append(tuple(self._cell))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None
        elif tag == "h5":
            self._in_h5 = False
            self.h5.append(" ".join(self._h5_text.split()))

    def handle_data(self, data):
        if self._cell is not None:
            self._cell[2] += data
        if self._in_h5:
            self._h5_text += data


def clean(text):
    return " ".join(html.unescape(text).split())


def parse_date(text):
    m = re.search(r"([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})", text)
    return date(int(m.group(3)), MONTHS[m.group(1).lower()], int(m.group(2))).isoformat()


def parse_division(key, did):
    with urllib.request.urlopen(SOURCE.format(did), timeout=30) as r:
        page = r.read().decode("utf-8", errors="replace")
    p = RowParser()
    p.feed(page)

    title = next((h for h in p.h5 if re.match(r"^\w+day\s+\"", h)), "")
    tm = re.match(r'^(\w+day)\s+"([^"]+)"\s+(.*?)\s*League$', title)
    if not tm:
        sys.exit(f"{did}: could not read the division title (got {title!r})")
    night, name, fmt = tm.groups()

    weeks, week = [], None
    for row in p.rows:
        first_tag, attrs, text = row[0]
        if first_tag == "th":
            wm = re.search(r"Week:\s*(\d+)", text)
            if wm:
                week = {"week": int(wm.group(1)), "date": parse_date(text), "notes": [], "matches": []}
                weeks.append(week)
            elif week and attrs.get("bgcolor", "").lower() not in HEADER_BG and clean(text):
                week["notes"].append(clean(text).capitalize())
            continue
        if week is None or len(row) < 5:
            continue
        home, status, away, venue_cell, score_cell = (c[2] for c in row[:5])
        venue_lines = [clean(v) for v in venue_cell.split("\n") if clean(v)]
        match = {"home": clean(home), "away": clean(away),
                 "venue": venue_lines[0] if venue_lines else ""}
        tbl = next((re.sub(r"(?i)^table\s*", "", v) for v in venue_lines[1:] if v.lower().startswith("table")), None)
        if tbl:
            match["table"] = tbl
        sm = re.fullmatch(r"(\d+)\s*-\s*(\d+)", clean(score_cell))
        if "PLAYED" in status.upper() and sm:
            match["score"] = [int(sm.group(1)), int(sm.group(2))]
        week["matches"].append(match)

    for w in weeks:
        if not w["notes"]:
            del w["notes"]

    if not weeks:
        sys.exit(f"{did}: no weeks found on the NAPA page")
    venues = sorted({m["venue"] for w in weeks for m in w["matches"] if m["venue"]})
    return {
        "id": key,
        "name": name,
        "night": night,
        "format": fmt,
        "napa_division_id": str(did),
        "start": weeks[0]["date"],
        "end": weeks[-1]["date"],
        "venues": venues,
        "source": SOURCE.format(did),
        "weeks": weeks,
    }


def main(args):
    if not args:
        sys.exit(__doc__)
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    if args == ["--refresh"]:
        args = [f"{d['id']}={d['napa_division_id']}" for d in old.get("divisions", [])]
        if not args:
            sys.exit(f"--refresh: no divisions in {OUT}")
    divisions = []
    for arg in args:
        key, _, did = arg.partition("=")
        if not (key and did.isdigit()):
            sys.exit(f"Bad argument {arg!r}; expected key=ID, e.g. tuesday-etown-metro=14269")
        d = parse_division(key, did)
        matches = sum(len(w["matches"]) for w in d["weeks"])
        print(f"{key}: {d['night']} {d['name']} ({did}) - {len(d['weeks'])} weeks, {matches} matches, {d['start']} to {d['end']}")
        divisions.append(d)
    if divisions == old.get("divisions"):
        print("No changes.")
        return
    OUT.parent.mkdir(exist_ok=True)
    data = {"updated": date.today().isoformat(), "divisions": divisions}
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
