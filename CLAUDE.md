# coolhandbilliards.com

Website for Coolhand Billiards LLC — NAPA pool league franchise, North Central
Kentucky (Nelson, Hardin, LaRue counties). Est. 2017.

The owner is not a developer. Explain every change in plain language, show the
diff, and ask before committing or pushing.

## Deploy

- Pushing to `main` on GitHub (Trace7768/coolhandbilliards) deploys to Netlify
  automatically. There is no build step; Netlify publishes the repo root as-is.
- **Never commit or push without showing the diff and getting a clear OK.**
  Approval for one commit does not carry over to the next.
- Keep unrelated changes in separate commits.
- Git is not on PATH. Use GitHub Desktop's copy:
  `$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`

## The repo is PUBLIC

Anything committed — including deleted files in history — is visible on GitHub.
- Never commit player names, phone numbers, emails, availability, or anything
  meant only for a team.
- Never commit secrets. (EmailJS public keys are designed to be public; that is
  the one exception, when the intake form is added.)
- Team-page PINs are a convenience, not security. Real private content needs
  real protection (Netlify password protection or a private repo) first.

## Branding

- Black-and-white minimalist. No accent colors, gradients, or shadows.
- Background `#111111`, text `#FFFFFF`. Surfaces `#1a1a1a`, borders `#2a2a2a`,
  muted text `#aaaaaa`.
- DM Sans everywhere (Google Fonts, weights 300 body / 400 labels / 500 headings).
- Broadway only for the logo/hero. In practice the logo is the image
  `players/CHB_Black_trans.png`, shown on dark pages with `filter: invert(1)`.
  Don't load Broadway as a web font.
- Mobile-first: design for a phone first, 16–24px side padding, no sideways
  scrolling, tap targets at least 44px tall.
- Labels are terse. Use league words: session, night, division, venue.
  NAPA is always all-caps. Team names are proper nouns.

## Tech rules

- Plain HTML, CSS, and JavaScript. No frameworks, build tools, or npm packages
  unless the owner approves.
- All schedule data lives in one data file (planned: `data/sessions.json`).
  Pages read from it; never hard-code schedules or dates into HTML.
- No schedule images. Schedules render as text tables that work on a phone.

## Site map

| Path | What it is |
|---|---|
| `index.html` | Homepage: league nights, how to join, link to Player Portal |
| `players/index.html` | Player Portal: list of teams |
| `players/tuesday.html`, `players/wednesday.html` | Old session-based PIN pages (to be replaced) |
| `players/CHB_Black_trans.png` | Logo, favicon, social share image |

Not in the repo yet: the intake form (`chb-intake.html`) — waiting on EmailJS
keys.

## New session checklist

(Finalize once the data file is built.)

1. Get the new NAPA schedule for each division (paste or attach it in chat).
2. In the data file, for each division starting a new session, update:
   NAPA division ID, start/end dates, closure/bye weeks, and the weekly
   matchups/tables.
3. Remove divisions that have ended; add any new ones.
4. Point each team to its new division. Team PINs do not change.
5. Update team weblinks if any changed.
6. Check the Schedules page on a phone-sized screen, then show the diff and
   commit only after approval.
