# AGENTS.md — FIFA World Cup 2026 Project Rules

This repository is a Traditional Chinese static FIFA World Cup 2026 information site.

## Baseline

- Current production baseline: v2.107
- Default branch: `main`
- Next version: v2.108
- Production: https://bruce690813.github.io/fifaworldcup2026/
- Main runtime: large monolithic `index.html`
- No framework, bundler, backend, or npm build step

Read `CODEX_HANDOFF_v2.107.md` before changing anything.

## Mandatory workflow

1. Start from the latest `main`.
2. Create `codex/v<version>-<topic>`.
3. Keep the diff narrowly scoped to the user request.
4. Do not directly push to `main`; all changes must first be committed to a feature branch and submitted through a Pull Request.
5. Create a Pull Request for human review. Exception: when the user explicitly says `直接合併 main` for the current Pull Request, Codex may merge that existing Pull Request into `main` only after all required automated tests have completed successfully and GitHub reports no merge conflict. This permission applies only to that specific Pull Request and must not be treated as standing authorization for later work.
6. Do not globally reformat `index.html`.
7. Do not make unrelated refactors or visual redesigns.

### Direct merge safeguards

- Never bypass, disable, or administratively override branch protection, required reviews, required checks, or other GitHub safeguards.
- Do not merge while any required test is pending, skipped, cancelled, timed out, or failing.
- Do not merge a draft Pull Request; mark it ready for review first.
- After merging, verify that the Pull Request reports `MERGED` and that the merge commit is present on `origin/main`.

## Runtime source of truth

- Most active data and behavior are embedded in `index.html`.
- Most `data/*.json` files are maintenance snapshots and are not fetched by filename at runtime.
- Before editing data, find the active embedded structure and keep mirrored JSON in sync when appropriate.
- Five top-league squad files in `data/club_squads/*.js` are loaded at runtime.

## Never break

- 48 teams, A–L groups, 1,248 players, 48 coaches and captains.
- 104 matches and 104/104 scorer/minute details; penalty shoot-out kicks excluded from normal goals.
- ELTA Sports official direct single-video YouTube links only. Never replace with search URLs, playlists, ELTA.tv, or another channel.
- Full 211 FIFA ranking/member lists and 48-team gold qualification markers.
- Team/player bilingual and fuzzy search, jersey-number search, player row jump/highlight.
- Desktop seven-tab navigation and mobile feature drawer/player cards.
- Modal close button, backdrop close, Escape close, and focus return.
- Taiwan high-resolution outline plus small blue point, flag, and `台灣` label without connector line.
- Map group/continent mutual exclusion and country labels near real locations.
- ESPN multi-source squad fallback and 12-hour localStorage cache.
- Fjelstul CC BY-SA attribution and `DATA_LICENSE_FJELSTUL.txt`.

## Visual contract

- Header title must stay `2026FIFA世界盃` with subtitle `FIFA WORLD CUP 2026`.
- Title is plain bold white: no glow, LED, dotted-football font, or generated title artwork.
- Theme: deep navy sports header + light information surfaces + gold highlights + red active state.
- Gold is reserved for champions, rankings, awards, important numbers, and qualification.
- Do not apply global dark button styles; search suggestions must remain readable with light background and blue text.
- Desktop tab order:
  1. ⚽️ 本屆球隊
  2. ⚽️ 本屆戰績
  3. ⚽️ 世界地圖
  4. ⚽️ FIFA排名
  5. ⚽️ 賽事指南
  6. ⚽️ 足球教室
  7. ⚽️ 全部功能
- Tabs are first row; group/continent/search controls are second row.

## Map collision rule

- Keep labels at the original country anchor when there is no collision.
- Only move a label when an actual overlap exists.
- Prefer small nearby offsets; never pre-offset Ecuador, Paraguay, or other countries far from their geography.
- Regression checks: Group J (`約旦`, `阿爾及利亞`, `奧地利`) and South America (`阿根廷`, `烏拉圭`, `巴拉圭`, `厄瓜多`, `哥倫比亞`, `巴西`).

## Bracket rule

- Desktop bracket must fit inside the modal without required horizontal dragging.
- No overlap between semifinal cards and the central final/champion panel.
- Test England/Argentina semifinal cards, both outer Round-of-16 edges, and the bottom notes.
- ELTA highlight control uses the YouTube play icon only, with accessible title/aria-label.

## Version update checklist

For every release:

- Increment version exactly once.
- Update the visible badge, `aria-label`, and `title` in `index.html`.
- Add the new changelog block at the top of `README.txt`.
- Use commit `Update website to v<version>`.
- PR title: `v<version>｜<Traditional Chinese summary>`.

## Required validation

- `git diff --check`
- Parse every `data/**/*.json` as UTF-8 JSON.
- Run `node --check` on each `data/club_squads/*.js`.
- Extract and syntax-check inline scripts from `index.html`.
- Serve through HTTP, not only `file://`: `python -m http.server 8000`.
- Check browser console.
- Test 1920×1080, 1366×768, 1024×768, and 390×844.
- Include before/after screenshots and test results in the PR.

## Data naming constraints

Use Taiwan Traditional Chinese common names. Preserve recent mappings documented in `CODEX_HANDOFF_v2.107.md`, including `古拉索`, `南韓`, `VOZINHA＝沃齊尼亞`, and `SCHJELDERUP Andreas＝謝爾德魯普`.
