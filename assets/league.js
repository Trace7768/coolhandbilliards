// Shared helpers for pages that read data/sessions.json and players/teams.json.
const CHB = (() => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Today's date as YYYY-MM-DD in the viewer's local time.
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // "2026-10-07" -> "Wed, Oct 7" (parsed as a calendar date, never shifted by time zone)
  function fmtDate(iso, withDay = true) {
    const [y, m, d] = iso.split("-").map(Number);
    const dow = DAYS[new Date(y, m - 1, d).getDay()];
    return `${withDay ? dow + ", " : ""}${MONTHS[m - 1]} ${d}`;
  }

  // The week being played today, or the next one coming up. null once the session is over.
  function currentWeek(division) {
    const t = today();
    return division.weeks.find((w) => w.date >= t) || null;
  }

  async function getJSON(url, timeoutMs = 8000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-cache", signal: ctl.signal });
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Data files (schedules, awards, posts) and their photos are read straight
  // from GitHub, so updating them never needs a (credit-costing) Netlify
  // deploy. Falls back to the copy deployed with the site. Needs the repo to
  // be public.
  // A local preview (python -m http.server) uses this computer's files instead.
  const GITHUB = location.hostname === "localhost" ? "/" : "https://raw.githubusercontent.com/Trace7768/coolhandbilliards/main/";
  const loadLive = (path) => getJSON(GITHUB + path, 4000).catch(() => getJSON("/" + path));
  // Photos live in the repo too; a new one may not be on Netlify yet, so use GitHub's copy.
  const photo = (path) => GITHUB + path.replace(/^\//, "");

  const loadSessions = () => loadLive("data/sessions.json");
  const loadTeams = () => getJSON("/players/teams.json");

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(c));
    }
    return node;
  }

  function where(match) {
    return match.table ? `${match.venue} · Table ${match.table}` : match.venue;
  }

  // Standings: { rows: [{ place, name, points }], label }. rows is empty when
  // there are none yet. Prefer NAPA's official standings (copied from the
  // scratch sheet by tools/napa_import.py). Without them, add up match points
  // — team divisions only; singles makeups throw summed scores off.
  function standings(division) {
    const official = division.standings;
    if (official && official.rows && official.rows.length) {
      return { rows: official.rows, label: official.round ? `after round ${official.round}` : "" };
    }
    if (/singles/i.test(division.format)) return { rows: [], label: "" };

    const pts = new Map();
    let through = null;
    for (const w of division.weeks) {
      for (const m of w.matches) {
        for (const n of [m.home, m.away]) if (!pts.has(n)) pts.set(n, 0);
        if (m.score) {
          pts.set(m.home, pts.get(m.home) + m.score[0]);
          pts.set(m.away, pts.get(m.away) + m.score[1]);
          through = w;
        }
      }
    }
    if (!through) return { rows: [], label: "" };
    const rows = [...pts].map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    rows.forEach((r, i) => { r.place = i && r.points === rows[i - 1].points ? rows[i - 1].place : i + 1; });
    return { rows, label: `after week ${through.week}` };
  }

  // 1 -> "1st", 2 -> "2nd", 11 -> "11th", 22 -> "22nd"
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // "2026-09" -> "September 2026"; "2026-09-14" -> "September 14, 2026"
  function fmtLong(iso) {
    const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const [y, m, d] = iso.split("-").map(Number);
    return d ? `${FULL[m - 1]} ${d}, ${y}` : `${FULL[m - 1]} ${y}`;
  }

  // Plain text with blank lines between paragraphs -> <p> elements.
  const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => el("p", {}, p.trim()));

  return { today, fmtDate, fmtLong, currentWeek, standings, ordinal, loadLive, loadSessions, loadTeams, photo, paragraphs, el, where };
})();
