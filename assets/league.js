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

  // Schedules are read straight from GitHub, where the auto-refresh workflow
  // saves them, so score updates never need a (credit-costing) Netlify deploy.
  // Falls back to the copy deployed with the site. Needs the repo to be public.
  const LIVE_SESSIONS = "https://raw.githubusercontent.com/Trace7768/coolhandbilliards/main/data/sessions.json";
  const loadSessions = () => getJSON(LIVE_SESSIONS, 4000).catch(() => getJSON("/data/sessions.json"));
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

  return { today, fmtDate, currentWeek, loadSessions, loadTeams, el, where };
})();
