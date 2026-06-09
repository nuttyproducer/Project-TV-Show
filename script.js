// I use this to remember API results so I don't fetch the same thing twice.
// Key = the URL, value = the data we got back.
const cache = {};

// All the shows we got from TVMaze.
let allShows = [];

// The episodes of the show the user clicked on.
let allEpisodes = [];


// I created genre buckets for the Netflix-style rows.
// I really had to find a way to group multiple genres into one row — just my UI preference :D
const genreBuckets = [
  { label: "Drama",                 genres: ["Drama", "Legal", "Medical", "History", "War"] },
  { label: "Comedy",                genres: ["Comedy", "Music"] },
  { label: "Action & Adventure",    genres: ["Action", "Adventure", "Sports", "Espionage", "Western"] },
  { label: "Crime & Thriller",      genres: ["Crime", "Thriller", "Mystery", "Horror"] },
  { label: "Sci-Fi & Fantasy",      genres: ["Science-Fiction", "Fantasy", "Supernatural", "Anime"] },
  { label: "Romance",               genres: ["Romance"] },
  { label: "Documentary & Reality", genres: ["Nature", "DIY", "Food", "Travel"] },
  { label: "Family & Kids",         genres: ["Children", "Family"] },
];


// --- SETUP ---
// This runs once when the page loads. I hook up all the buttons and inputs here.

function setup() {
  // Shows page — search box and sort dropdown
  document.getElementById("shows-search").addEventListener("input", handleShowsSearch);
  document.getElementById("shows-sort").addEventListener("change", renderGenreRows);

  // Episodes page — back button, search box, and jump-to-episode dropdown
  document.getElementById("back-to-shows").addEventListener("click", showShowsView);
  document.getElementById("search-input").addEventListener("input", handleEpisodeSearch);
  document.getElementById("episode-selector").addEventListener("change", handleEpisodeJump);
  document.getElementById("episodes-season-select").addEventListener("change", applyEpisodeFilters);
  document.getElementById("episodes-load-more-btn").addEventListener("click", function () {
    var filtered = getFilteredEpisodes();
    if (episodesVisible < filtered.length) {
      loadNextBatch(filtered);
    }
  });

  // Kick everything off by fetching all the shows
  fetchShows();
}

window.onload = setup;


// --- FETCHING DATA ---

// I made this helper so I never fetch the same URL twice.
// If we already have the data saved in cache, just use that instead.
function fetchWithCache(url) {
  if (cache[url]) {
    return Promise.resolve(cache[url]);
  }
  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      cache[url] = data;
      return data;
    });
}

function fetchShows() {
  fetchWithCache("https://api.tvmaze.com/shows")
    .then((shows) => {
      allShows = shows;
      renderGenreRows();
      startHeroRotation();
    })
    .catch(() => {
      document.getElementById("genre-rows").innerHTML =
        '<p class="no-results">Could not load shows. Please try again later.</p>';
    });
}

function fetchEpisodes(showId) {
  const cardsBox = document.getElementById("episode-cards");
  cardsBox.innerHTML = '<p class="no-results">Loading episodes...</p>';

  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;
  fetchWithCache(url)
    .then((episodes) => {
      allEpisodes = episodes;
      buildSeasonSelector(episodes);
      fillEpisodeSelector(episodes);
      applyEpisodeFilters();
    })
    .catch(() => {
      cardsBox.innerHTML =
        '<p class="no-results">Could not load episodes. Please try again later.</p>';
    });
}


// --- HERO BANNER (the big rotating image at the top) ---

// I store the timer here so I can stop it later when the user navigates away.
let heroTimer = null;

function startHeroRotation() {
  stopHeroRotation();

  // I noticed some shows don't have images, so I filter those out first.
  // If none of them have images at all, I just skip the hero section entirely.
  const showsWithImages = allShows.filter((s) => s.image);
  if (showsWithImages.length === 0) return;

  // I make a shuffled copy so the hero shows up in a random order each visit.
  // .slice() makes a copy first so I don't mess up the original array.
  const shuffled = showsWithImages.slice().sort(() => Math.random() - 0.5);
  let index = 0;

  // Show the first one straight away
  showHero(shuffled[0]);

  // Then every 8 seconds, move to the next show in the shuffled list.
  // When we reach the end, % brings us back to the start (so it loops forever).
  heroTimer = setInterval(() => {
    index = (index + 1) % shuffled.length;
    switchHero(shuffled[index]);
  }, 8000);
}

function stopHeroRotation() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

// Put the show's title, summary and background image into the hero section.
function showHero(show) {
  // I try the big (original) image first. If that doesn't exist, I fall back to the smaller (medium) one.
  // TVMaze sometimes only has one of them, so this way it always works.
  const imageUrl = show.image.original || show.image.medium;
  document.getElementById("hero-title").textContent = show.name;
  document.getElementById("hero-summary").innerHTML = show.summary || "";
  document.getElementById("hero-bg").style.backgroundImage = `url("${imageUrl}")`;
}

// Swap to a new show with a fade effect: text fades out → image fades out → swap → image fades in → text fades in.
function switchHero(show) {
  const text = document.getElementById("hero-contents");
  const bg = document.getElementById("hero-bg");

  // Step 1: fade the text out
  text.classList.add("is-fading");

  // Step 2: after 300ms, start fading the background image out too
  setTimeout(() => {
    bg.classList.add("is-fading");

    // Step 3: after another 400ms, swap in the new show and fade the image back in
    setTimeout(() => {
      showHero(show);
      bg.classList.remove("is-fading");

      // Step 4: after another 400ms, fade the text back in
      setTimeout(() => {
        text.classList.remove("is-fading");
      }, 400);
    }, 400);
  }, 300);
}


// --- SWITCHING BETWEEN PAGES ---

function showShowsView() {
  if (loadMoreObserver) loadMoreObserver.disconnect();
  document.getElementById("episodes-view").classList.add("hidden");
  document.getElementById("shows-view").classList.remove("hidden");
  startHeroRotation();
  window.scrollTo(0, 0);
}

function showEpisodesView() {
  stopHeroRotation();
  document.getElementById("shows-view").classList.add("hidden");
  document.getElementById("episodes-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}


// --- SHOWS PAGE ---

// Sort the shows either A-Z or by rating, depending on what the user picked in the dropdown.
function sortShows(shows) {
  const sortChoice = document.getElementById("shows-sort").value;
  const sorted = shows.slice(); // copy first so I don't change the original

  if (sortChoice === "rating") {
    sorted.sort((a, b) => {
      const ratingA = a.rating && a.rating.average ? a.rating.average : 0;
      const ratingB = b.rating && b.rating.average ? b.rating.average : 0;
      return ratingB - ratingA;
    });
  } else {
    sorted.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  return sorted;
}

// Check if a show belongs in a genre bucket.
// A show can have multiple genres, so I check if any of them match.
function showMatchesBucket(show, bucket) {
  const showGenres = show.genres || [];
  for (const genre of showGenres) {
    if (bucket.genres.includes(genre)) return true;
  }
  return false;
}

// Build the Netflix-style genre rows on the Shows page.
function renderGenreRows() {
  document.getElementById("shows-flat").classList.add("hidden");
  const rowsBox = document.getElementById("genre-rows");
  rowsBox.classList.remove("hidden");
  rowsBox.innerHTML = "";

  const sortedShows = sortShows(allShows);

  // Go through each genre bucket and build a scrollable row of cards
  for (const bucket of genreBuckets) {
    const showsInBucket = sortedShows.filter((show) => showMatchesBucket(show, bucket));

    // If no shows fit this bucket, skip it entirely
    if (showsInBucket.length === 0) continue;

    const row = document.createElement("section");
    row.className = "genre-row";

    const title = document.createElement("h2");
    title.className = "genre-row-title";
    title.textContent = bucket.label;

    const scroller = document.createElement("div");
    scroller.className = "genre-row-scroll";
    for (const show of showsInBucket) {
      scroller.appendChild(createShowCard(show));
    }

    row.appendChild(title);
    row.appendChild(scroller);
    rowsBox.appendChild(row);
  }
}

// Build one show card. Clicking it opens a detail modal for that show.
function createShowCard(show) {
  const card = document.createElement("article");
  card.className = "show-card";

  const image = document.createElement("div");
  image.className = "show-card-img";
  if (show.image) {
    image.style.backgroundImage = `url("${show.image.medium}")`;
  }

  const body = document.createElement("div");
  body.className = "show-card-body";

  const title = document.createElement("h3");
  title.className = "show-card-title";
  title.textContent = show.name;

  // Small info line: rating, runtime, status
  const meta = document.createElement("div");
  meta.className = "show-card-meta";

  if (show.rating && show.rating.average) {
    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = `★ ${show.rating.average}`;
    meta.appendChild(rating);
  }
  if (show.runtime) {
    const runtime = document.createElement("span");
    runtime.textContent = `${show.runtime} min`;
    meta.appendChild(runtime);
  }
  if (show.status) {
    const status = document.createElement("span");
    status.textContent = show.status;
    meta.appendChild(status);
  }

  const summary = document.createElement("p");
  summary.className = "show-card-summary";
  // I use innerHTML here on purpose — TVMaze summaries already contain HTML tags like <p>
  summary.innerHTML = show.summary || "No summary available.";

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(summary);
  card.appendChild(image);
  card.appendChild(body);

  // Click → open the episodes page for this show
  card.addEventListener("click", () => openShow(show));

  // Hover → open trailer popup after a short delay.
  // Kicks off the YouTube API fetch immediately so the iframe is already
  // buffering by the time the popup appears.
  let hoverTimer = null;

  card.addEventListener("mouseenter", function () {
    var cardEl = card;
    // Start fetching the trailer ID right away — don't wait for the timer.
    // If it's in the cache this returns instantly; otherwise the API call
    // runs in parallel with the 600ms delay.
    preloadTrailerForShow(show);

    hoverTimer = setTimeout(function () {
      openTrailerPopup(show, cardEl);
    }, 600);
  });

  card.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    scheduleTrailerPopupClose();
  });

  return card;
}

// ─── TRAILER HOVER POPUP ─────────────────────────────────────────────

// A floating popup that shows a YouTube trailer when you hover over a show card.
// It uses the YouTube Data API v3 to find the right trailer, then embeds it directly.
// Results are cached so each show is searched only once per session.
const trailerCache = {};        // key = show name, value = YouTube video ID (or null)
let trailerPopupShow = null;   // which show the popup is currently showing
let trailerCloseTimer = null;  // timer for delayed close

// Search YouTube Data API v3 for one trailer matching this show.
// Returns a videoId string, or null if nothing was found.
function fetchTrailerId(showName) {
  // Return the cached result instantly (even if it was null — no trailer exists)
  if (showName in trailerCache) {
    return Promise.resolve(trailerCache[showName]);
  }

  const query = encodeURIComponent(showName + " official trailer");
  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet" +
    "&maxResults=1" +
    "&q=" + query +
    "&type=video" +
    "&videoEmbeddable=true" +
    "&videoDefinition=high" +
    "&key=" + YOUTUBE_API_KEY;

  return fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var videoId;
      if (data.items && data.items[0]) {
        videoId = data.items[0].id.videoId;
      } else {
        videoId = null;
      }
      trailerCache[showName] = videoId;
      return videoId;
    })
    .catch(function () {
      trailerCache[showName] = null;
      return null;
    });
}

// Build the embed URL for a known video ID.
// Sound ON — the user just hovered, so the browser allows unmuted autoplay.
function getEmbedUrl(videoId) {
  return (
    "https://www.youtube-nocookie.com/embed/" + videoId +
    "?autoplay=1" +
    "&mute=0" +
    "&controls=0" +
    "&modestbranding=1" +
    "&rel=0" +
    "&enablejsapi=1"
  );
}

// Kick off the API fetch + iframe preload the moment the user hovers a card.
// Runs in parallel with the 600ms delay — by the time the popup opens,
// the iframe is already buffering the video.
function preloadTrailerForShow(show) {
  fetchTrailerId(show.name).then(function (videoId) {
    if (!videoId) return;
    // Only preload if this is still the show we care about
    // (trailerPopupShow is null during the preload phase)
    var popup = document.getElementById("trailer-popup");
    if (!popup) return;
    var iframe = popup.querySelector(".trailer-popup-iframe");
    // If the iframe is empty or showing a different video, start loading this one
    if (!iframe.src || trailerPopupShow === null || trailerPopupShow === show) {
      iframe.src = getEmbedUrl(videoId);
    }
  });
}

// Create the popup DOM once and reuse it.
// Layout: left = 16:9 trailer, right = show title + summary + button.
function getTrailerPopup() {
  var popup = document.getElementById("trailer-popup");
  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "trailer-popup";
  popup.className = "trailer-popup";

  // Left column — the trailer
  var left = document.createElement("div");
  left.className = "trailer-popup-left";

  var videoBox = document.createElement("div");
  videoBox.className = "trailer-popup-video-box";

  var iframe = document.createElement("iframe");
  iframe.className = "trailer-popup-iframe";
  iframe.setAttribute("allow", "autoplay; encrypted-media");
  iframe.setAttribute("allowfullscreen", "");
  videoBox.appendChild(iframe);
  left.appendChild(videoBox);

  // Right column — show info
  var right = document.createElement("div");
  right.className = "trailer-popup-right";

  var title = document.createElement("h2");
  title.className = "trailer-popup-title";
  right.appendChild(title);

  var summary = document.createElement("div");
  summary.className = "trailer-popup-summary";
  right.appendChild(summary);

  var episodesBtn = document.createElement("button");
  episodesBtn.className = "trailer-popup-episodes-btn";
  episodesBtn.textContent = "▶ View Episodes";
  episodesBtn.addEventListener("click", function () {
    if (trailerPopupShow) {
      var showToOpen = trailerPopupShow;
      closeTrailerPopup();
      openShow(showToOpen);
    }
  });
  right.appendChild(episodesBtn);

  popup.appendChild(left);
  popup.appendChild(right);

  // Keep the popup open while the mouse is over it
  popup.addEventListener("mouseenter", function () {
    clearTimeout(trailerCloseTimer);
  });
  popup.addEventListener("mouseleave", function () {
    closeTrailerPopup();
  });

  document.body.appendChild(popup);
  return popup;
}

// Position the popup next to the card and start loading the trailer.
function openTrailerPopup(show, card) {
  clearTimeout(trailerCloseTimer);

  // If it's the same show already showing, just keep it open
  if (trailerPopupShow === show) return;

  trailerPopupShow = show;

  var popup = getTrailerPopup();
  var iframe = popup.querySelector(".trailer-popup-iframe");

  // Fill in the show info on the right side
  popup.querySelector(".trailer-popup-title").textContent = show.name;
  popup.querySelector(".trailer-popup-summary").innerHTML =
    show.summary || "<p>No summary available.</p>";

  // Measure the popup so we can position it without clipping
  // (it's currently hidden, so we briefly make it visible to measure)
  popup.classList.add("is-open");
  var popupRect = popup.getBoundingClientRect();
  var popupWidth = popupRect.width || 1100;
  var popupHeight = popupRect.height || 470;
  popup.classList.remove("is-open");

  var cardRect = card.getBoundingClientRect();

  var left = cardRect.right + 20;
  var top = cardRect.top;

  // Flip to the left if it would go off-screen
  if (left + popupWidth > window.innerWidth - 20) {
    left = cardRect.left - popupWidth - 20;
  }
  // If still off-screen (narrow viewport), centre it
  if (left < 20) {
    left = Math.max(20, (window.innerWidth - popupWidth) / 2);
  }

  // Keep it vertically within the viewport
  if (top + popupHeight > window.innerHeight - 20) {
    top = window.innerHeight - popupHeight - 20;
  }
  if (top < 20) top = 20;

  popup.style.left = left + "px";
  popup.style.top = top + "px";

  popup.classList.add("is-open");

  // The iframe might already have the right src from preloadTrailerForShow().
  // Check: does it already contain the cached videoId for this show?
  var cachedId = trailerCache[show.name];
  if (cachedId) {
    // Already cached — use it now (preload might have set it already)
    var expectedSrc = getEmbedUrl(cachedId);
    if (iframe.src !== expectedSrc) {
      iframe.src = expectedSrc;
    }
    // else: preload already set the right src — leave it playing
  } else {
    // Not cached yet — clear the old one, then fetch
    iframe.src = "";
    fetchTrailerId(show.name).then(function (videoId) {
      if (trailerPopupShow !== show) return;
      if (videoId) {
        iframe.src = getEmbedUrl(videoId);
      }
    });
  }
}

function scheduleTrailerPopupClose() {
  // Small delay before closing, so the user can reach the popup itself
  trailerCloseTimer = setTimeout(function () {
    closeTrailerPopup();
  }, 200);
}

function closeTrailerPopup() {
  var popup = document.getElementById("trailer-popup");
  if (!popup) return;
  popup.classList.remove("is-open");
  trailerPopupShow = null;

  // Pause the video by clearing the src
  var iframe = popup.querySelector(".trailer-popup-iframe");
  if (iframe) iframe.src = "";
}

function openShow(show) {
  // Reset the episodes page before showing it
  document.getElementById("episodes-show-title").textContent = show.name;
  document.getElementById("search-input").value = "";
  document.getElementById("episode-selector").value = "all";
  document.getElementById("search-count").textContent = "";
  document.getElementById("episodes-load-more-box").classList.add("hidden");

  showEpisodesView();
  fetchEpisodes(show.id);
}

// Filter shows as the user types in the search box.
function handleShowsSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  const countEl = document.getElementById("shows-count");

  // If the search box is empty, go back to the normal genre rows
  if (term === "") {
    if (countEl) countEl.textContent = "";
    renderGenreRows();
    return;
  }

  // Keep only shows where the search term appears in the name, summary, or genres
  const matches = allShows.filter((show) => {
    const name = (show.name || "").toLowerCase();
    const summary = (show.summary || "").toLowerCase();
    const genres = (show.genres || []).join(" ").toLowerCase();
    return name.includes(term) || summary.includes(term) || genres.includes(term);
  });

  // Hide the genre rows and show a flat grid of search results instead
  document.getElementById("genre-rows").classList.add("hidden");
  document.getElementById("shows-flat").classList.remove("hidden");

  const grid = document.getElementById("shows-grid");
  grid.innerHTML = "";

  if (matches.length === 0) {
    grid.innerHTML = '<p class="no-results">No shows match your search.</p>';
  } else {
    for (const show of sortShows(matches)) {
      grid.appendChild(createShowCard(show));
    }
  }

  if (countEl) {
    countEl.textContent = `${matches.length} / ${allShows.length} shows`;
  }
}


// --- EPISODES PAGE ---

// Load-more state — how many episodes are currently visible
var episodesVisible = 0;
var EPISODES_PER_BATCH = 20;
var episodesLoading = false; // guard against double-loads

// IntersectionObserver — auto-loads the next batch when the button scrolls into view.
var loadMoreObserver = null;

function setupLoadMoreObserver() {
  if (loadMoreObserver) loadMoreObserver.disconnect();
  var loadBox = document.getElementById("episodes-load-more-box");
  loadMoreObserver = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !episodesLoading) {
      var filtered = getFilteredEpisodes();
      if (episodesVisible < filtered.length) {
        loadNextBatch(filtered);
      }
    }
  }, { rootMargin: "200px" });
  loadMoreObserver.observe(loadBox);
}

// Called once after episodes load to set up the observer.
function initLoadMore() {
  setupLoadMoreObserver();
}

// Trigger a load — shows the loading state, renders after a brief pause
// so the user sees the feedback.
function loadNextBatch(episodes) {
  if (episodesLoading) return;
  episodesLoading = true;

  var btn = document.getElementById("episodes-load-more-btn");
  btn.classList.add("is-loading");
  btn.textContent = "Loading…";
  btn.disabled = true;

  // Brief pause so the loading state is visible and the grid feels alive
  setTimeout(function () {
    renderNextBatch(episodes);

    btn.classList.remove("is-loading");
    btn.textContent = "Load More Episodes";
    btn.disabled = false;
    episodesLoading = false;

    // Re-check: if the button is still visible after this batch, trigger again
    // (e.g. the user has a tall screen and the button never left the viewport)
    var filtered = getFilteredEpisodes();
    if (episodesVisible < filtered.length) {
      var box = document.getElementById("episodes-load-more-box");
      var rect = box.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) {
        loadNextBatch(filtered);
      }
    }
  }, 350);
}

// Build the season selector dropdown from the episodes we have.
function buildSeasonSelector(episodes) {
  var sel = document.getElementById("episodes-season-select");
  var seasons = [];
  for (var i = 0; i < episodes.length; i++) {
    var s = episodes[i].season;
    if (seasons.indexOf(s) === -1) seasons.push(s);
  }
  seasons.sort(function (a, b) { return a - b; });

  sel.innerHTML = '<option value="all">All Seasons</option>';
  for (var j = 0; j < seasons.length; j++) {
    var opt = document.createElement("option");
    opt.value = seasons[j];
    opt.textContent = "Season " + seasons[j];
    sel.appendChild(opt);
  }
  sel.value = "all";
}

// Get the current filtered episode list (season + search).
function getFilteredEpisodes() {
  var season = document.getElementById("episodes-season-select").value;
  var term = document.getElementById("search-input").value.toLowerCase();

  var filtered = allEpisodes;
  if (season !== "all") {
    var seasonNum = parseInt(season, 10);
    filtered = filtered.filter(function (ep) { return ep.season === seasonNum; });
  }
  if (term) {
    filtered = filtered.filter(function (ep) {
      var nameHit = ep.name.toLowerCase().indexOf(term) !== -1;
      var summaryHit = ep.summary ? ep.summary.toLowerCase().indexOf(term) !== -1 : false;
      return nameHit || summaryHit;
    });
  }
  return filtered;
}

// Render the first batch of episodes and reset the load-more counter.
function renderEpisodes(episodes) {
  var container = document.getElementById("episode-cards");
  container.innerHTML = "";
  episodesVisible = 0;

  if (episodes.length === 0) {
    container.innerHTML = '<p class="no-results">No episodes match.</p>';
    updateEpisodeCount(0, allEpisodes.length);
    document.getElementById("episodes-load-more-box").classList.add("hidden");
    return;
  }

  updateEpisodeCount(episodes.length, allEpisodes.length);
  renderNextBatch(episodes);
  initLoadMore();
}

// Render one more batch of episodes (adds to the grid, doesn't clear it).
function renderNextBatch(episodes) {
  var container = document.getElementById("episode-cards");
  var end = Math.min(episodesVisible + EPISODES_PER_BATCH, episodes.length);

  for (var i = episodesVisible; i < end; i++) {
    var episode = episodes[i];
    var card = document.createElement("article");
    card.className = "episode-card";
    card.dataset.episodeId = episode.id;

    var seasonCode = String(episode.season).padStart(2, "0");
    var episodeCode = String(episode.number).padStart(2, "0");

    var title = document.createElement("h2");
    title.textContent = episode.name + " - S" + seasonCode + "E" + episodeCode;

    var image = document.createElement("img");
    image.src = episode.image ? episode.image.medium : "assets/images/no-image.png";
    image.alt = "Still image from episode: " + episode.name;

    var summary = document.createElement("p");
    summary.innerHTML = episode.summary || "No summary available.";

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);
    container.appendChild(card);
  }

  episodesVisible = end;

  // Show or hide the load-more button
  var loadBox = document.getElementById("episodes-load-more-box");
  if (episodesVisible < episodes.length) {
    loadBox.classList.remove("hidden");
  } else {
    loadBox.classList.add("hidden");
  }
}

// Run filters (season + search) and re-render from the top.
function applyEpisodeFilters() {
  var filtered = getFilteredEpisodes();
  var season = document.getElementById("episodes-season-select").value;

  // Rebuild the jump-to-episode dropdown with only episodes in scope
  if (season !== "all") {
    fillEpisodeSelector(filtered);
  } else {
    fillEpisodeSelector(allEpisodes);
  }

  renderEpisodes(filtered);
  document.getElementById("episode-selector").value = "all";
}

// Fill the "Jump to episode..." dropdown from the given episode list.
function fillEpisodeSelector(episodes) {
  var selector = document.getElementById("episode-selector");
  var currentVal = selector.value;
  selector.innerHTML = "";

  var placeholder = document.createElement("option");
  placeholder.value = "all";
  placeholder.textContent = "Jump to episode...";
  selector.appendChild(placeholder);

  for (var i = 0; i < episodes.length; i++) {
    var episode = episodes[i];
    var option = document.createElement("option");
    option.value = episode.id;
    var seasonCode = String(episode.season).padStart(2, "0");
    var episodeCode = String(episode.number).padStart(2, "0");
    option.textContent = "S" + seasonCode + "E" + episodeCode + " - " + episode.name;
    selector.appendChild(option);
  }

  // Restore previous selection if it still exists after rebuild
  selector.value = currentVal;
}

// When the user picks an episode from the dropdown, scroll to that card.
function handleEpisodeJump(event) {
  var id = event.target.value;
  if (id === "all") return;

  // If the user was searching or filtering, clear that first
  var searchInput = document.getElementById("search-input");
  if (searchInput.value !== "") {
    searchInput.value = "";
    document.getElementById("episodes-season-select").value = "all";
    applyEpisodeFilters();
  }

  // The card might not be rendered yet if it's past the current batch.
  // Expand the batch to include it.
  var filtered = getFilteredEpisodes();
  var idx = -1;
  for (var i = 0; i < filtered.length; i++) {
    if (filtered[i].id === parseInt(id, 10)) { idx = i; break; }
  }
  if (idx !== -1 && idx >= episodesVisible) {
    // Render all batches up to this one
    while (episodesVisible <= idx && episodesVisible < filtered.length) {
      renderNextBatch(filtered);
    }
  }

  var card = document.querySelector('.episode-card[data-episode-id="' + id + '"]');
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Filter episodes as the user types in the search box.
function handleEpisodeSearch(event) {
  applyEpisodeFilters();
  document.getElementById("episode-selector").value = "all";
}

function updateEpisodeCount(shown, total) {
  document.getElementById("search-count").textContent = `${shown} / ${total} episodes`;
}