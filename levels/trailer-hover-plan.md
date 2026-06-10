# Trailer on Hover — Implementation Plan

## Goal

When a user opens the show detail modal, hovering over the poster image reveals a
YouTube trailer for that show. The trailer plays inline inside the modal.

---

## Part 1 — Getting the YouTube trailer

The TVMaze API does **not** supply YouTube links. We have two options:

### Option A — YouTube Data API v3 (professional, recommended)

- **What**: Use Google's official search endpoint to find one trailer per show.
- **Cost**: Free — 10,000 quota units per day ≈ roughly 100 searches per day.
- **Setup**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Create a project → enable **YouTube Data API v3**
  3. Create an API key (restrict it to the YouTube Data API)
  4. Store the key in a new file `config.js` (git-ignored)

- **The API call** (from the browser, no backend needed):
  ```
  GET https://www.googleapis.com/youtube/v3/search
    ?part=snippet
    &maxResults=1
    &q={show.name}+official+trailer
    &type=video
    &key={YOUR_API_KEY}
  ```

- **Response** gives you a `videoId` like `"dQw4w9WgXcQ"`.

- **Embed**: `<iframe src="https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&mute=1&controls=0" />`

- ✅ Exact video, polished UX, you control the embed
- ❌ Requires API key setup (~5 minutes, once)

---

### Option B — YouTube iframe search embed (zero setup, less polished)

- **What**: Point an iframe at YouTube's built-in search-player.
- **No API key needed.**
- **Embed URL**:
  ```
  https://www.youtube-nocookie.com/embed?listType=search&list={encoded search term}&autoplay=1&mute=1
  ```
- **How it looks**: Shows a small search-result overlay inside the player
  — the user sees a playlist strip, not a clean single video.

- ✅ Zero credentials, always works
- ❌ Cluttered UI, less control over which video plays

---

### My recommendation

**Option A.** The API key setup is a one-time 5-minute chore, and the result
looks professional. The free tier is more than enough for a portfolio project.
If you'd rather skip that, Option B works as a quick fallback.

---

## Part 2 — How the UX works

```
User clicks show card
        │
        ▼
Modal opens (static poster image)
        │
        │  user hovers over poster
        ▼
Image fades out, YouTube iframe fades in, trailer auto-plays (muted)
        │
        │  user moves mouse away
        ▼
Iframe hidden, static image returns
```

Key behaviours:

| Event | What happens |
|---|---|
| Modal first opens | Static poster image shown (no API call yet) |
| First hover over poster | YouTube API is called, video ID cached, iframe inserted |
| Subsequent hovers | Cached video ID used instantly, no new API call |
| Mouse leaves poster | Iframe hidden (but kept in DOM), poster visible again |
| Modal closed | Trailer pauses (iframe removed or paused) |
| Another show opened | Same flow, new trailer fetched or cache hit |

The video always plays **muted** on hover. Unmuting is a deliberate user
action — browsers block unmuted autoplay anyway.

---

## Part 3 — What changes in the code

### New file: `config.js` (only for Option A)

```js
// config.js — git-ignored, never committed
const YOUTUBE_API_KEY = "AIza...your-key-here";
```

Add to `.gitignore`:
```
config.js
```

Add to `index.html`:
```html
<script src="config.js"></script>
<!-- must load before script.js so the key is available -->
```

### Changes to `script.js`

1. **Trailer cache** — add to the existing `cache` object pattern:

```js
// Next to the existing cache = {} at the top
const trailerCache = {};   // key = show name, value = YouTube video ID
```

2. **Fetch trailer ID** (Option A):

```js
function fetchTrailerId(showName) {
  if (trailerCache[showName]) {
    return Promise.resolve(trailerCache[showName]);
  }
  const query = encodeURIComponent(showName + " official trailer");
  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet" +
    "&maxResults=1" +
    "&q=" + query +
    "&type=video" +
    "&key=" + YOUTUBE_API_KEY;

  return fetch(url)
    .then(r => r.json())
    .then(data => {
      const videoId = data.items && data.items[0]
        ? data.items[0].id.videoId
        : null;
      trailerCache[showName] = videoId;
      return videoId;
    })
    .catch(() => null);
}
```

2b. **Alternative: fetch for Option B** (no API key):

```js
function getTrailerEmbedUrl(showName) {
  const query = encodeURIComponent(showName + " official trailer");
  return "https://www.youtube-nocookie.com/embed" +
    "?listType=search" +
    "&list=" + query +
    "&autoplay=1" +
    "&mute=1";
  // No fetch needed — just build the URL and embed it directly
}
```

3. **Update `getModal()`** — add the hover behaviour to the poster area:

```js
// Inside getModal(), after creating the left column:

// Create a wrapper for the poster that can hold either image or iframe
const posterWrapper = document.createElement("div");
posterWrapper.className = "modal-poster-wrapper";

// The static image (always present)
const img = document.createElement("img");
img.className = "modal-image";
img.alt = "";
posterWrapper.appendChild(img);

// The iframe (created on first hover, reused after)
let trailerIframe = null;

posterWrapper.addEventListener("mouseenter", () => {
  if (!currentModalShow) return;

  // Lazy fetch trailer only on first hover
  fetchTrailerId(currentModalShow.name).then(videoId => {
    if (!videoId) return;

    if (!trailerIframe) {
      trailerIframe = document.createElement("iframe");
      trailerIframe.className = "modal-trailer";
      trailerIframe.setAttribute("allow", "autoplay; encrypted-media");
      trailerIframe.setAttribute("allowfullscreen", "");
      trailerIframe.src =
        "https://www.youtube-nocookie.com/embed/" + videoId +
        "?autoplay=1&mute=1&controls=0&modestbranding=1";
      posterWrapper.appendChild(trailerIframe);
    } else {
      // Re-trigger play on re-hover
      trailerIframe.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}', '*'
      );
    }

    trailerIframe.classList.add("is-visible");
    img.classList.add("is-hidden");
  });
});

posterWrapper.addEventListener("mouseleave", () => {
  if (trailerIframe) {
    trailerIframe.classList.remove("is-visible");
    img.classList.remove("is-hidden");
    // Pause the video
    trailerIframe.contentWindow.postMessage(
      '{"event":"command","func":"pauseVideo","args":""}', '*'
    );
  }
});

// Replace the current left-column code with posterWrapper
left.appendChild(posterWrapper);
left.appendChild(rating);
left.appendChild(meta);
```

4. **Update `openShowModal()`** — reset the poster state:

```js
// In openShowModal(), after setting the image src:
// Reset trailer state for the new show
const trailerEl = overlay.querySelector(".modal-trailer");
if (trailerEl) {
  trailerEl.classList.remove("is-visible");
  // Remove old iframe so we create a fresh one for the new show
  trailerEl.remove();
}
const posterImg = overlay.querySelector(".modal-image");
if (posterImg) posterImg.classList.remove("is-hidden");
```

### New CSS

Add to `style.css`:

```css
/* Trailer hover */
.modal-poster-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
  cursor: pointer;
}

.modal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 300ms ease;
  opacity: 1;
}
.modal-image.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.modal-trailer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
}
.modal-trailer.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/* Play button overlay hint on poster */
.modal-poster-wrapper::after {
  content: "▶";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 250ms ease;
  pointer-events: none;
}
.modal-poster-wrapper:hover::after {
  opacity: 1;
}
```

---

## Part 4 — Implementation steps (in order)

| Step | File | What | Difficulty |
|---|---|---|---|
| 1 | `config.js` (new) | Create file with your YouTube API key | ⭐ |
| 2 | `.gitignore` | Add `config.js` | ⭐ |
| 3 | `index.html` | Add `<script src="config.js">` before `script.js` | ⭐ |
| 4 | `script.js` | Add `trailerCache` object | ⭐ |
| 5 | `script.js` | Add `fetchTrailerId()` function | ⭐⭐ |
| 6 | `style.css` | Add `.modal-poster-wrapper`, `.modal-trailer`, play-button overlay CSS | ⭐⭐ |
| 7 | `script.js` | Refactor `getModal()` — wrap image in posterWrapper, add hover listeners | ⭐⭐⭐ |
| 8 | `script.js` | Update `openShowModal()` — reset trailer state per show | ⭐⭐ |
| 9 | — | Test: click show → hover poster → trailer plays → leave → stops | — |

---

## Part 5 — Possible pitfalls & fixes

| Problem | Fix |
|---|---|
| YouTube API returns the wrong video (e.g. a fan video) | Add `&videoEmbeddable=true` to the search query |
| Some shows have no trailer at all | `fetchTrailerId()` returns `null` → hide the play overlay with CSS |
| Rate limit hit | The `trailerCache` means each show is searched only once per session |
| Autoplay blocked by browser | Always `mute=1` in the embed URL; unmuted autoplay is blocked everywhere |
| Iframe doesn't respond to `postMessage` | YouTube's iframe API requires `enablejsapi=1` param |

---

## Final note — you can definitely build this

The core logic is ~40 lines of JS and ~40 lines of CSS. The API key setup is the
only part that happens outside the codebase. Everything else follows the same
patterns you already use: `fetch` + `cache` + `createElement` + CSS transitions.

If you go with **Option B** (no API key), it's even simpler: you skip steps 1–5
entirely and just build a URL. The hover behaviour is identical either way.
