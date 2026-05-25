# Netflix-Style Plan for TV Show Project

## Our Simplified Netflix Layout (For next levels)

```
┌─────────────────────────────────────────┐
│           BANNER (show title)           │  ← static, no video needed
├─────────────────────────────────────────┤
│  Season 1                               │
│  [ card ] [ card ] [ card ] →scroll→   │  ← horizontal scrollable row
├─────────────────────────────────────────┤
│  Season 2                               │
│  [ card ] [ card ] [ card ] →scroll→   │
├─────────────────────────────────────────┤
│  ...                                    │
├─────────────────────────────────────────┤
│  Footer: "Data from TVMaze.com"         │
└─────────────────────────────────────────┘
```

---

## What Each Episode Card Shows

```
┌──────────────────┐
│   [image]        │  ← episode.image.medium
│  S01E01          │  ← episode code
│  Episode Name    │  ← episode.name
└──────────────────┘
     ↕ hover → zoom effect
```

---

## CSS Classes We Need

| Class                | What it does                                  |
| -------------------- | --------------------------------------------- |
| `body`               | Dark background `#111`, white text            |
| `.banner`            | Big top section with show name                |
| `#episode-cards`     | Wrapper for all season rows                   |
| `.season-row`        | One row per season (label + scrollable cards) |
| `.season-row__cards` | Horizontal flexbox, overflow-x scroll         |
| `.episode-card`      | Individual card, fixed width, hover zoom      |
| `.episode-card img`  | Full-width image inside the card              |
| `footer`             | Simple dark footer with attribution           |

---

## JavaScript Changes Needed

Right now all 73 episodes are dumped into one container.
To get **one row per season**, we need to:

1. Group episodes by season number
2. For each season, create a `.season-row` with a heading
3. Inside each row, create the scrollable `.season-row__cards` container
4. Append episode cards into that container

> This is a JavaScript challenge — we'll tackle it after the CSS is in place!

---

## Order of Work

### Level 100 ✅

- [ ] 1. Add basic dark theme CSS (body, cards, images)
- [ ] 2. Add banner at the top of `index.html`
- [ ] 3. Add hover zoom effect on cards
- [ ] 4. Update JS to group episodes by season into separate rows
- [ ] 5. Style each season row as a horizontal scrollable strip

---

## Level 200 — Search & Episode Selector

> ⚠️ Level 200 is done in your **partner's repo**, not your own.
> Fork their repo, refactor first, then add features via Pull Request.

### What needs to be built

#### 1. Live Search Input

- A text `<input>` at the top of the page
- As the user types, filter episodes in real time (on every keystroke)
- Match against **both** `episode.name` and `episode.summary`
- Search must be **case-insensitive**
- Show how many episodes match (e.g. "Displaying 10/73 episodes")
- When input is cleared → show all 73 episodes again

#### 2. Episode Selector (dropdown)

- A `<select>` element listing every episode in format: `S01E01 - Winter is Coming`
- When user picks one → scroll/jump to that episode on the page
- Bonus: show only the selected episode, with a way to reset back to all

---

### HTML changes needed (Level 200)

Add a controls bar above the episode cards:

```html
<div id="controls">
  <input type="text" id="search-input" placeholder="Search episodes..." />
  <span id="episode-count">Displaying 73/73 episodes</span>
  <select id="episode-selector">
    <option value="">Select an episode...</option>
    <!-- filled by JavaScript -->
  </select>
</div>
```

---

### JavaScript changes needed (Level 200)

| Function to write               | What it does                                                        |
| ------------------------------- | ------------------------------------------------------------------- |
| `filterEpisodes(searchTerm)`    | Returns only episodes whose name or summary includes the term       |
| `populateSelector(episodeList)` | Fills the `<select>` with one option per episode                    |
| Search event listener           | Calls `filterEpisodes` on every `input` keystroke, re-renders cards |
| Selector event listener         | Scrolls to or highlights the selected episode                       |

---

### Key JavaScript concepts used in Level 200

- `.toLowerCase()` — for case-insensitive search comparison
- `.includes()` — to check if a string contains the search term
- `.filter()` — to get only the matching episodes from the array
- `addEventListener("input", ...)` — fires on every keystroke
- `document.getElementById(...).scrollIntoView()` — to jump to an episode

---

### Order of Work (Level 200)

- [ ] 1. Fork partner's repo and review their Level 100 code
- [ ] 2. Refactor any unclear names or functions (PR first!)
- [ ] 3. Add `<input>` search bar to HTML
- [ ] 4. Write `filterEpisodes` function in JS
- [ ] 5. Hook up search input event listener → re-render cards + update count
- [ ] 6. Add `<select>` dropdown filled by JS
- [ ] 7. Hook up selector → scroll to episode
- [ ] 8. Send Pull Request to partner's repo
