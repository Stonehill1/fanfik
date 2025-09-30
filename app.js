// Конфигурация фанфиков берётся из файлов данных (data/*.js),
// которые объявляют глобальные переменные DATA_SALIK и DATA_FROSAO.
const FANFICS = [
  DATA_SALIK.meta,
  DATA_FROSAO.meta,
];

// Элементы интерфейса
const el = {
  body: document.body,
  back: document.getElementById('back-button'),
  themeToggle: document.getElementById('theme-toggle'),
  footerProgress: document.getElementById('footer-progress'),

  readerView: document.getElementById('reader-view'),

  fanficsList: document.getElementById('fanfics-list'),
  fanficTitle: document.getElementById('fanfic-title'),
  seasonsSection: document.getElementById('seasons-section'),
  seasonsList: document.getElementById('seasons-list'),
  continueFanfic: document.getElementById('continue-fanfic'),

  readerFanficName: document.getElementById('reader-fanfic-name'),
  readerSeasonName: document.getElementById('reader-season-name'),
  readerContent: document.getElementById('reader-content'),
  continueReader: document.getElementById('continue-reader'),
};

// Хранилище прогресса
const STORAGE_KEYS = {
  THEME: 'reader.theme',
  FANFIC_PROGRESS: (fanficId) => `reader.progress.${fanficId}`, // { seasonId, file, pct }
  SEASON_PROGRESS: (fanficId, seasonIdOrSingle) => `reader.progress.${fanficId}.${seasonIdOrSingle}`, // { pct }
};

function readJSON(key, fallback = null) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Тема
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  applyTheme(saved);
  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : current === 'light' ? null : 'dark';
    if (next) localStorage.setItem(STORAGE_KEYS.THEME, next); else localStorage.removeItem(STORAGE_KEYS.THEME);
    applyTheme(next);
  });
}

// Навигация состояний
// В двухпанельном интерфейсе назад переводит к списку фанфиков (сворачивает сезоны)
el.back.addEventListener('click', () => {
  el.seasonsSection.hidden = true;
  el.back.hidden = true;
});

// Домашняя страница
function renderHome() {
  el.fanficsList.innerHTML = '';
  FANFICS.forEach((fanfic) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'item';
    const progress = readJSON(STORAGE_KEYS.FANFIC_PROGRESS(fanfic.id));
    const progressPct = progress?.pct ? Math.round(progress.pct * 100) : 0;
    btn.innerHTML = `
      <div class="row" style="width:100%">
        <div>
          <div style="font-weight:600">${fanfic.title}</div>
          ${progressPct ? `<div class="muted">Прогресс: ${progressPct}%</div>` : ''}
        </div>
        <div class="season-badge">${fanfic.type === 'seasonal' ? 'Сезоны' : 'Одиночный'}</div>
      </div>
    `;
    btn.addEventListener('click', () => openFanfic(fanfic.id));
    li.appendChild(btn);
    if (progressPct) {
      const bar = document.createElement('div');
      bar.className = 'progressbar';
      const fill = document.createElement('span');
      fill.style.width = `${progressPct}%`;
      bar.appendChild(fill);
      li.appendChild(bar);
    }
    el.fanficsList.appendChild(li);
  });
}

// Открытие фанфика (для сезонного показывает сезоны, для одиночного сразу читает)
function openFanfic(fanficId) {
  const fanfic = FANFICS.find((f) => f.id === fanficId);
  if (!fanfic) return;

  if (fanfic.type === 'single') {
    openReader({ fanficId: fanfic.id, fanficTitle: fanfic.title, seasonId: 'single', seasonTitle: '', content: DATA_FROSAO.content });
    return;
  }

  // Сезонный
  el.fanficTitle.textContent = fanfic.title;
  el.seasonsList.innerHTML = '';
  const fanficProgress = readJSON(STORAGE_KEYS.FANFIC_PROGRESS(fanfic.id));
  el.continueFanfic.hidden = !fanficProgress;
  if (fanficProgress) {
    el.continueFanfic.textContent = 'Продолжить чтение';
    el.continueFanfic.onclick = () => {
      const season = DATA_SALIK.seasons.find((x) => x.id === fanficProgress.seasonId) || DATA_SALIK.seasons[0];
      openReader({ fanficId: fanfic.id, fanficTitle: fanfic.title, seasonId: season.id, seasonTitle: season.title, content: season.content });
    };
  }

  DATA_SALIK.seasons.forEach((s) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'item';
    const seasonProgress = readJSON(STORAGE_KEYS.SEASON_PROGRESS(fanfic.id, s.id));
    const pct = seasonProgress?.pct ? Math.round(seasonProgress.pct * 100) : 0;
    btn.innerHTML = `
      <div class="row" style="width:100%">
        <div>
          <div style="font-weight:600">${s.title}</div>
          ${pct ? `<div class=muted>Прогресс: ${pct}%</div>` : ''}
        </div>
      </div>
    `;
    btn.addEventListener('click', () => openReader({ fanficId: fanfic.id, fanficTitle: fanfic.title, seasonId: s.id, seasonTitle: s.title, content: s.content }));
    li.appendChild(btn);
    if (pct) {
      const bar = document.createElement('div');
      bar.className = 'progressbar';
      const fill = document.createElement('span');
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);
      li.appendChild(bar);
    }
    el.seasonsList.appendChild(li);
  });
  el.seasonsSection.hidden = false;
  el.back.hidden = false;
}

function titleBySeasonId(fanfic, seasonId) {
  return fanfic.seasons.find((x) => x.id === seasonId)?.title || '';
}

// Читалка
let currentReader = null; // { fanficId, fanficTitle, seasonId, seasonTitle, content }
let scrollSaveTimer = null;

function openReader({ fanficId, fanficTitle, seasonId, seasonTitle, content }) {
  currentReader = { fanficId, fanficTitle, seasonId, seasonTitle, content };
  el.readerFanficName.textContent = fanficTitle;
  el.readerSeasonName.textContent = seasonTitle;
  el.readerContent.textContent = 'Загрузка...';
  el.footerProgress.textContent = '';
  el.continueReader.hidden = true;

  // Показать кнопку продолжения, если есть сохранённая позиция
  const saved = readJSON(STORAGE_KEYS.SEASON_PROGRESS(fanficId, seasonId));
  if (saved && saved.pct > 0) {
    el.continueReader.hidden = false;
    el.continueReader.onclick = () => restoreScroll(saved.pct);
  }

  // Рендерим из встроенного контента (Markdown)
  renderMarkdownTo(content, el.readerContent);
  // восстановим позицию если только что вошли из «продолжить»
  if (saved && saved.pct > 0) restoreScroll(saved.pct);
  // обновим прогресс футера
  updateFooterProgress(0);
}

function getScrollPct() {
  const elc = el.readerContent;
  const maxScroll = Math.max(1, elc.scrollHeight - elc.clientHeight);
  return Math.min(1, Math.max(0, elc.scrollTop / maxScroll));
}

function restoreScroll(pct) {
  const elc = el.readerContent;
  const maxScroll = Math.max(0, elc.scrollHeight - elc.clientHeight);
  elc.scrollTop = maxScroll * pct;
  updateFooterProgress(pct);
}

function saveProgressThrottled() {
  if (!currentReader) return;
  if (scrollSaveTimer) return;
  scrollSaveTimer = setTimeout(() => {
    scrollSaveTimer = null;
    const pct = getScrollPct();
    // Сохраняем прогресс сезона
    writeJSON(
      STORAGE_KEYS.SEASON_PROGRESS(currentReader.fanficId, currentReader.seasonId),
      { pct }
    );
    // Сохраняем общий прогресс фанфика (последний сезон и файл)
    writeJSON(
      STORAGE_KEYS.FANFIC_PROGRESS(currentReader.fanficId),
      { seasonId: currentReader.seasonId, pct }
    );
    updateFooterProgress(pct);
  }, 300);
}

function updateFooterProgress(pct) {
  const percent = Math.round((pct ?? getScrollPct()) * 100);
  el.footerProgress.textContent = percent ? `Прогресс: ${percent}%` : '';
}

el.readerContent.addEventListener('scroll', saveProgressThrottled);
window.addEventListener('beforeunload', () => saveProgressThrottled());

// Инициализация
function init() {
  initTheme();
  renderHome();
}

document.addEventListener('DOMContentLoaded', init);

// Простой Markdown рендерер (заголовки, списки, параграфы, кодовые блоки, инлайн код)
function renderMarkdownTo(markdown, container) {
  const html = markdownToHtml(markdown || '');
  container.innerHTML = html;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}

function markdownToHtml(src) {
  // Минимальный разбор: блоки кода ``` ``` , заголовки # ## ###, списки -, * , нумерованные
  // и параграфы; инлайн `code` и **bold** _italic_.
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let out = [];
  let inCode = false; let codeBuf = [];
  let listType = null; // 'ul' | 'ol'
  function flushParagraph(buf) {
    if (buf.length) { out.push(`<p>${buf.join(' ')}</p>`); buf.length = 0; }
  }
  function closeList() { if (listType) { out.push(`</${listType}>`); listType = null; } }
  const paraBuf = [];
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (inCode) {
      if (line.trim().startsWith('```')) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = []; inCode = false;
      } else { codeBuf.push(line); }
      continue;
    }
    if (line.trim().startsWith('```')) { flushParagraph(paraBuf); closeList(); inCode = true; continue; }
    if (!line.trim()) { flushParagraph(paraBuf); closeList(); continue; }

    // Заголовки
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) { flushParagraph(paraBuf); closeList(); const level=m[1].length; out.push(`<h${level}>${inlineMd(m[2])}</h${level}>`); continue; }
    // Списки
    let lm = line.match(/^\s*[-*]\s+(.*)$/);
    if (lm) { flushParagraph(paraBuf); if (listType !== 'ul') { closeList(); listType='ul'; out.push('<ul>'); } out.push(`<li>${inlineMd(lm[1])}</li>`); continue; }
    lm = line.match(/^\s*\d+\.\s+(.*)$/);
    if (lm) { flushParagraph(paraBuf); if (listType !== 'ol') { closeList(); listType='ol'; out.push('<ol>'); } out.push(`<li>${inlineMd(lm[1])}</li>`); continue; }
    // Параграф
    paraBuf.push(inlineMd(line));
  }
  if (inCode) { out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`); }
  flushParagraph(paraBuf); closeList();
  return out.join('\n');
}

function inlineMd(s) {
  let r = escapeHtml(s);
  r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  r = r.replace(/_(.+?)_/g, '<em>$1</em>');
  r = r.replace(/`([^`]+?)`/g, '<code>$1</code>');
  // Простейшие ссылки [текст](url)
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return r;
}


