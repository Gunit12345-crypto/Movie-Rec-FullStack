/* ═══════════════════════════════════════════════
   CINEMATCH — FRONTEND LOGIC
   ═══════════════════════════════════════════════ */
const API_URL = 'https://movie-rec-fullstack.onrender.com/recommend';

// Genre labels for visual variety (rotated based on index)
const GENRES = ['Action', 'Drama', 'Thriller', 'Sci-Fi', 'Adventure', 'Crime', 'Mystery', 'Fantasy'];
const POSTER_EMOJIS = ['🎬', '🎭', '🎥', '🎞️', '🍿', '🎦', '🌟', '🎪'];

// HSL hues for card gradients — cinematic palette
const CARD_HUES = [210, 230, 190, 220, 200, 215, 235, 205];

/* ── Particle System ── */
function initParticles() {
  const container = document.getElementById('particles');
  const count = window.innerWidth < 768 ? 12 : 22;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = Math.random() * 3 + 1;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 15;
    const opacity = Math.random() * 0.5 + 0.2;

    p.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      opacity: ${opacity};
    `;
    container.appendChild(p);
  }
}

/* ── Enter key support ── */
document.addEventListener('DOMContentLoaded', () => {
  initParticles();

  const input = document.getElementById('movieInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') getRecommendations();
  });

  // Input shake on empty submit
  input.addEventListener('animationend', () => {
    input.style.animation = '';
  });
});

/* ── State management ── */
function showSection(id) {
  ['loaderSection', 'errorSection', 'resultsSection'].forEach(s => {
    document.getElementById(s).classList.remove('visible');
  });
  if (id) document.getElementById(id).classList.add('visible');
}

function clearError() {
  showSection(null);
  document.getElementById('movieInput').focus();
}

/* ── Card Builder ── */
function buildCard(title, index) {
  const hue = CARD_HUES[index % CARD_HUES.length];
  const emoji = POSTER_EMOJIS[index % POSTER_EMOJIS.length];
  const genre = GENRES[index % GENRES.length];
  const matchScore = Math.floor(Math.random() * 15 + 80); // 80–95%
  const delay = index * 80;

  const card = document.createElement('div');
  card.className = 'movie-card';
  card.style.cssText = `
    --card-hue: ${hue};
    animation-delay: ${delay}ms;
  `;

  card.innerHTML = `
    <div class="card-sheen"></div>
    <div class="card-poster">
      <span class="card-poster-icon">${emoji}</span>
      <div class="card-poster-overlay"></div>
      <div class="card-rank">${index + 1}</div>
      <div class="card-match">${matchScore}%</div>
    </div>
    <div class="card-body">
      <div class="card-title">${escapeHTML(title)}</div>
      <div class="card-genre">${genre}</div>
      <div class="card-action">
        <button class="card-search-btn" onclick="searchThisMovie(${JSON.stringify(title)})">
          Find Similar
        </button>
        <button class="card-play-btn" title="Search on Google">▶</button>
      </div>
    </div>
  `;

  // Play button → open Google search
  card.querySelector('.card-play-btn').addEventListener('click', () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' movie')}`, '_blank');
  });

  return card;
}

/* ── Recursive similarity search ── */
function searchThisMovie(title) {
  const input = document.getElementById('movieInput');
  input.value = title;
  input.focus();
  getRecommendations();

  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── HTML escape ── */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Input shake animation ── */
function shakeInput() {
  const container = document.getElementById('searchContainer');
  container.style.animation = 'none';
  container.offsetHeight; // reflow
  container.style.animation = 'shake 0.4s ease';
}

// Inject shake keyframe
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    15%       { transform: translateX(-8px); }
    30%       { transform: translateX(8px); }
    45%       { transform: translateX(-5px); }
    60%       { transform: translateX(5px); }
    75%       { transform: translateX(-3px); }
    90%       { transform: translateX(3px); }
  }
`;
document.head.appendChild(style);

/* ══════════════════════════════════════
   MAIN API FUNCTION
══════════════════════════════════════ */
async function getRecommendations() {
  const input = document.getElementById('movieInput');
  const btn = document.getElementById('searchBtn');
  const movie = input.value.trim();

  // Validate
  if (!movie) {
    shakeInput();
    input.focus();
    return;
  }

  // Loading state
  showSection('loaderSection');
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ movie }),
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errData.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();

    // Validate response shape
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No recommendations found for "${movie}". Try a different title.`);
    }

    renderResults(movie, data);

  } catch (err) {
    const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
    const msg = isNetworkError
      ? 'Cannot connect to the Flask server. Make sure it\'s running on https://movie-rec-fullstack.onrender.com/recommend'
      : err.message;

    document.getElementById('errorMsg').textContent = msg;
    showSection('errorSection');

  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
  }
}

/* ── Render Results ── */
function renderResults(movie, titles) {
  const grid = document.getElementById('cardsGrid');
  const countEl = document.getElementById('resultsCount');
  const nameEl = document.getElementById('resultsMovieName');

  // Clear old cards
  grid.innerHTML = '';

  // Update header
  countEl.textContent = titles.length;
  nameEl.textContent = movie.toUpperCase();

  // Build cards
  const fragment = document.createDocumentFragment();
  titles.forEach((title, i) => {
    fragment.appendChild(buildCard(title, i));
  });
  grid.appendChild(fragment);

  showSection('resultsSection');

  // Smooth scroll to results
  setTimeout(() => {
    document.getElementById('resultsSection').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 150);
}