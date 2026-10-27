const COLORS = [
  { name: 'Red', value: '#ec3b35' },
  { name: 'Blue', value: '#2465e8' },
  { name: 'Green', value: '#18a05e' },
  { name: 'Yellow', value: '#d9a500' },
];

const BLEND_MODES = [
  { value: 'multiply', name: 'Multiply', description: 'Shared strokes become darker.' },
  { value: 'screen', name: 'Screen', description: 'Shared strokes become brighter.' },
  { value: 'overlay', name: 'Overlay', description: 'Shared strokes gain contrast.' },
  { value: 'difference', name: 'Difference', description: 'Shared strokes reveal color differences.' },
  { value: 'exclusion', name: 'Exclusion', description: 'A softer version of Difference.' },
  { value: 'darken', name: 'Darken', description: 'Keeps the darker color channels.' },
  { value: 'lighten', name: 'Lighten', description: 'Keeps the lighter color channels.' },
];

const state = {
  fonts: {
    a: { kind: 'google', name: 'Inter', css: 'Inter' },
    b: { kind: 'google', name: 'Roboto', css: 'Roboto' },
  },
  colors: { a: COLORS[0], b: COLORS[1] },
  blendMode: 'multiply',
  set: 'standard',
  chars: [],
  catalog: [],
  localFonts: [],
  detailIndex: -1,
};

const grid = document.getElementById('glyph-grid');
const gridScroll = document.getElementById('grid-scroll');
const dialog = document.getElementById('detail-dialog');
const detailCanvas = document.getElementById('detail-canvas');
const visibleCards = new Set();
const googleLoads = new Map();
let uploadSlot = 'a';
let loadSequence = { a: 0, b: 0 };

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const card = entry.target;
    const canvas = card.querySelector('canvas');
    if (entry.isIntersecting) {
      visibleCards.add(card);
      drawCanvas(canvas, state.chars[Number(card.dataset.index)], 248, 205);
    } else {
      visibleCards.delete(card);
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}, { root: gridScroll, rootMargin: '350px 0px' });

function setStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.hidden = message === 'Ready to compare';
}

function escapeFontName(name) {
  return JSON.stringify(name);
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i));
}

function customCharacters(text) {
  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(item => item.segment)
    : Array.from(text);
  return [...new Set(segments.filter(ch => !/^[\r\n\t]$/.test(ch)))];
}

function getCharacters() {
  if (state.set === 'custom') return customCharacters(document.getElementById('custom-chars').value);
  const standard = range(0x20, 0x7e);
  return state.set === 'extended' ? standard.concat(range(0xa0, 0x17f)) : standard;
}

function labelFor(ch) {
  if (ch === ' ') return 'SPACE';
  if (ch === '\u00a0') return 'NBSP';
  return ch;
}

function codeFor(ch) {
  return Array.from(ch).map(part => `U+${part.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ');
}

function drawCanvas(canvas, char, width, height) {
  if (!char) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const realWidth = Math.round(width * ratio);
  const realHeight = Math.round(height * ratio);
  if (canvas.width !== realWidth || canvas.height !== realHeight) {
    canvas.width = realWidth;
    canvas.height = realHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);
  const size = Math.round(height * 0.82);
  const baseline = height * 0.755;
  const center = width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const slot of ['a', 'b']) {
    const font = state.fonts[slot];
    ctx.font = `${size}px ${escapeFontName(font.css)}`;
    ctx.fillStyle = state.colors[slot].value;
    ctx.globalCompositeOperation = slot === 'a' ? 'source-over' : state.blendMode;
    ctx.fillText(char, center, baseline, width * 0.87);
  }
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

function redrawVisible() {
  for (const card of visibleCards) {
    drawCanvas(card.querySelector('canvas'), state.chars[Number(card.dataset.index)], 248, 205);
  }
  if (dialog.open && state.detailIndex >= 0) drawCanvas(detailCanvas, state.chars[state.detailIndex], 510, 510);
}

function renderGrid() {
  observer.disconnect();
  visibleCards.clear();
  state.chars = getCharacters();
  const fragment = document.createDocumentFragment();
  state.chars.forEach((char, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'glyph-card';
    card.dataset.index = String(index);
    card.setAttribute('aria-label', `Inspect ${labelFor(char)}, ${codeFor(char)}`);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div');
    info.className = 'glyph-info';
    const label = document.createElement('span');
    label.className = 'glyph-label';
    label.textContent = labelFor(char);
    const code = document.createElement('span');
    code.className = 'glyph-code';
    code.textContent = codeFor(char);
    info.append(label, code);
    const arrow = document.createElement('span');
    arrow.className = 'glyph-arrow';
    arrow.textContent = '↗';
    card.append(canvas, info, arrow);
    card.addEventListener('click', () => openDetail(index));
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
  for (const card of grid.children) observer.observe(card);
  document.getElementById('count-label').textContent = `${state.chars.length} ${state.chars.length === 1 ? 'CHARACTER' : 'CHARACTERS'}`;
  if (!state.chars.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-note';
    empty.textContent = 'Add characters to see the comparison.';
    grid.append(empty);
  }
  if (dialog.open) dialog.close();
}

function refreshNames() {
  for (const slot of ['a', 'b']) {
    const font = state.fonts[slot];
    const color = state.colors[slot].value;
    document.getElementById(`font-name-${slot}`).textContent = font.name;
    document.getElementById(`legend-name-${slot}`).textContent = font.name;
    document.getElementById(`indicator-${slot}`).style.background = color;
    document.getElementById(`legend-${slot}`).style.background = color;
    document.getElementById(`detail-dot-${slot}`).style.background = color;
    document.getElementById(`detail-font-${slot}`).textContent = font.name;
  }
}

function renderSwatches() {
  for (const slot of ['a', 'b']) {
    const container = document.getElementById(`swatches-${slot}`);
    container.replaceChildren();
    for (const color of COLORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `swatch${state.colors[slot].name === color.name ? ' selected' : ''}`;
      button.style.setProperty('--swatch', color.value);
      button.setAttribute('aria-label', `${color.name} for font ${slot.toUpperCase()}`);
      button.setAttribute('aria-pressed', String(state.colors[slot].name === color.name));
      button.title = color.name;
      button.addEventListener('click', () => {
        state.colors[slot] = color;
        if (state.colors.a.name === state.colors.b.name) {
          const other = slot === 'a' ? 'b' : 'a';
          state.colors[other] = COLORS.find(candidate => candidate.name !== color.name);
        }
        renderSwatches();
        updateBlendModes();
        refreshNames();
        redrawVisible();
      });
      container.append(button);
    }
  }
}

function drawBlendIcon(canvas, mode) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(28 * ratio);
  canvas.height = Math.round(20 * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, 28, 20);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = state.colors.a.value;
  ctx.beginPath();
  ctx.arc(10, 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = state.colors.b.value;
  ctx.beginPath();
  ctx.arc(18, 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 28, 20);
  ctx.globalCompositeOperation = 'source-over';
}

function updateBlendModes() {
  const container = document.getElementById('blend-modes');
  for (const button of container.querySelectorAll('.blend-mode')) {
    const active = button.dataset.mode === state.blendMode;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
    drawBlendIcon(button.querySelector('canvas'), button.dataset.mode);
  }
  document.getElementById('blend-description').textContent = BLEND_MODES.find(mode => mode.value === state.blendMode).description;
}

function renderBlendModes() {
  const container = document.getElementById('blend-modes');
  for (const mode of BLEND_MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blend-mode';
    button.dataset.mode = mode.value;
    const symbol = document.createElement('canvas');
    symbol.className = 'blend-mode-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = mode.name;
    button.append(symbol, label);
    button.addEventListener('click', () => {
      state.blendMode = mode.value;
      updateBlendModes();
      redrawVisible();
    });
    container.append(button);
  }
  updateBlendModes();
}

async function ensureGoogleFont(family) {
  if (!googleLoads.has(family)) {
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Google Fonts could not load “${family}”.`));
      document.head.append(link);
    });
    googleLoads.set(family, promise);
  }
  await googleLoads.get(family);
  await document.fonts.load(`170px ${escapeFontName(family)}`, state.chars.join('') || 'Aa');
}

async function selectGoogle(slot, family) {
  family = family.trim();
  if (!family) return;
  const sequence = ++loadSequence[slot];
  setStatus(`Loading ${family}`);
  try {
    await ensureGoogleFont(family);
    if (sequence !== loadSequence[slot]) return;
    state.fonts[slot] = { kind: 'google', name: family, css: family };
    document.getElementById(`google-${slot}`).value = family;
    refreshNames();
    redrawVisible();
    setStatus('Ready to compare');
  } catch (error) {
    if (sequence === loadSequence[slot]) setStatus(error.message || 'Font could not be loaded');
    googleLoads.delete(family);
  }
}

function closeSuggestions(slot) {
  const list = document.getElementById(`suggestions-${slot}`);
  list.classList.remove('open');
  list.replaceChildren();
  document.getElementById(`google-${slot}`).setAttribute('aria-expanded', 'false');
}

function showSuggestions(slot) {
  const input = document.getElementById(`google-${slot}`);
  const list = document.getElementById(`suggestions-${slot}`);
  const query = input.value.trim().toLocaleLowerCase();
  const matches = state.catalog.filter(item => item.family.toLocaleLowerCase().includes(query)).slice(0, 12);
  list.replaceChildren();
  for (const item of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion';
    button.setAttribute('role', 'option');
    const name = document.createElement('span');
    name.textContent = item.family;
    const category = document.createElement('small');
    category.textContent = item.category.replace(/_/g, ' ');
    button.append(name, category);
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      closeSuggestions(slot);
      selectGoogle(slot, item.family);
    });
    list.append(button);
  }
  list.classList.toggle('open', matches.length > 0);
  input.setAttribute('aria-expanded', String(matches.length > 0));
}

function setupGoogleSearch(slot) {
  const input = document.getElementById(`google-${slot}`);
  input.addEventListener('focus', () => showSuggestions(slot));
  input.addEventListener('input', () => showSuggestions(slot));
  input.addEventListener('keydown', event => {
    const options = [...document.getElementById(`suggestions-${slot}`).children];
    const active = options.findIndex(option => option.classList.contains('active'));
    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      options.forEach(option => option.classList.remove('active'));
      options[(active + 1) % options.length].classList.add('active');
    } else if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      options.forEach(option => option.classList.remove('active'));
      options[(active - 1 + options.length) % options.length].classList.add('active');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = options.find(option => option.classList.contains('active'));
      const family = chosen ? chosen.querySelector('span').textContent : input.value;
      closeSuggestions(slot);
      selectGoogle(slot, family);
    } else if (event.key === 'Escape') {
      closeSuggestions(slot);
    }
  });
  input.addEventListener('blur', () => setTimeout(() => closeSuggestions(slot), 120));
}

function switchSource(slot, source) {
  for (const button of document.querySelectorAll(`.source-tab[data-slot="${slot}"]`)) {
    button.classList.toggle('active', button.dataset.source === source);
  }
  document.getElementById(`google-panel-${slot}`).hidden = source !== 'google';
  document.getElementById(`computer-panel-${slot}`).hidden = source !== 'computer';
}

function fillLocalSelects() {
  const sorted = [...state.localFonts].sort((a, b) => a.name.localeCompare(b.name));
  for (const slot of ['a', 'b']) {
    const select = document.getElementById(`local-${slot}`);
    const current = state.fonts[slot].id || '';
    select.replaceChildren(new Option('Choose a font…', ''));
    for (const groupName of ['Uploaded fonts', 'Installed fonts']) {
      const group = document.createElement('optgroup');
      group.label = groupName;
      for (const font of sorted.filter(item => (item.kind === 'upload') === (groupName === 'Uploaded fonts'))) {
        group.append(new Option(font.name, font.id));
      }
      if (group.children.length) select.append(group);
    }
    select.value = current;
  }
}

async function selectLocal(slot, id) {
  const record = state.localFonts.find(item => item.id === id);
  if (!record) return;
  const sequence = ++loadSequence[slot];
  setStatus(`Loading ${record.name}`);
  try {
    if (!record.css) {
      const data = record.kind === 'upload' ? await record.file.arrayBuffer() : await (await record.fontData.blob()).arrayBuffer();
      const family = `FontOverlayLocal${record.id.replace(/\W/g, '')}`;
      const face = new FontFace(family, data);
      await face.load();
      document.fonts.add(face);
      record.css = family;
    }
    if (sequence !== loadSequence[slot]) return;
    state.fonts[slot] = { kind: 'local', name: record.name, css: record.css, id: record.id };
    fillLocalSelects();
    refreshNames();
    redrawVisible();
    setStatus('Ready to compare');
  } catch (error) {
    if (sequence === loadSequence[slot]) setStatus(`Could not open ${record.name}`);
  }
}

async function browseInstalled(slot) {
  if (typeof window.queryLocalFonts !== 'function') {
    setStatus('Installed font listing is unavailable; upload a font file');
    return;
  }
  setStatus('Waiting for font access');
  try {
    const fonts = await window.queryLocalFonts();
    const existing = new Set(state.localFonts.map(item => item.id));
    for (const font of fonts) {
      const id = `system-${font.postscriptName || font.fullName}`;
      if (existing.has(id)) continue;
      existing.add(id);
      state.localFonts.push({ id, kind: 'system', name: font.fullName || font.family, fontData: font, css: null });
    }
    fillLocalSelects();
    setStatus(`${fonts.length} installed fonts found`);
    document.getElementById(`local-${slot}`).focus();
  } catch (error) {
    setStatus(error.name === 'NotAllowedError' ? 'Font access was declined; upload a font file' : 'Installed font access is unavailable; upload a font file');
  }
}

function openDetail(index) {
  state.detailIndex = index;
  updateDetail();
  dialog.showModal();
  drawCanvas(detailCanvas, state.chars[index], 510, 510);
}

function updateDetail() {
  const char = state.chars[state.detailIndex];
  if (!char) return;
  document.getElementById('detail-title').textContent = labelFor(char);
  document.getElementById('detail-index').textContent = `${String(state.detailIndex + 1).padStart(2, '0')} / ${state.chars.length} · ${codeFor(char)}`;
  redrawVisible();
}

function moveDetail(step) {
  if (!state.chars.length) return;
  state.detailIndex = (state.detailIndex + step + state.chars.length) % state.chars.length;
  updateDetail();
}

async function init() {
  try {
    const response = await fetch('./fonts.json');
    if (!response.ok) throw new Error('Catalog unavailable');
    state.catalog = await response.json();
  } catch {
    state.catalog = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Playfair Display', 'Merriweather', 'Source Sans 3', 'Nunito'].map(family => ({ family, category: '' }));
  }
  setupGoogleSearch('a');
  setupGoogleSearch('b');
  document.addEventListener('click', event => {
    const tab = event.target.closest('.source-tab');
    if (tab) switchSource(tab.dataset.slot, tab.dataset.source);
    const action = event.target.closest('.small-action');
    if (action?.dataset.action === 'browse') browseInstalled(action.dataset.slot);
    if (action?.dataset.action === 'upload') {
      uploadSlot = action.dataset.slot;
      document.getElementById('font-file').click();
    }
  });
  document.getElementById('font-file').addEventListener('change', async event => {
    const files = [...event.target.files];
    if (!files.length) return;
    const batchId = Date.now();
    const firstId = `upload-${batchId}-0`;
    files.forEach((file, index) => {
      state.localFonts.push({ id: `upload-${batchId}-${index}`, kind: 'upload', name: file.name.replace(/\.(ttf|otf|woff2?)$/i, ''), file, css: null });
    });
    fillLocalSelects();
    await selectLocal(uploadSlot, firstId);
    event.target.value = '';
  });
  for (const slot of ['a', 'b']) {
    document.getElementById(`local-${slot}`).addEventListener('change', event => selectLocal(slot, event.target.value));
  }
  document.querySelectorAll('input[name="set"]').forEach(input => input.addEventListener('change', () => {
    state.set = input.value;
    document.querySelectorAll('.set-option').forEach(label => label.classList.toggle('selected', label.querySelector('input').checked));
    document.getElementById('custom-wrap').hidden = state.set !== 'custom';
    gridScroll.scrollTop = 0;
    renderGrid();
    if (state.fonts.a.kind === 'google') ensureGoogleFont(state.fonts.a.name).then(redrawVisible).catch(() => {});
    if (state.fonts.b.kind === 'google') ensureGoogleFont(state.fonts.b.name).then(redrawVisible).catch(() => {});
  }));
  document.getElementById('custom-chars').addEventListener('input', () => {
    if (state.set === 'custom') renderGrid();
  });
  document.getElementById('close-detail').addEventListener('click', () => dialog.close());
  document.getElementById('prev-char').addEventListener('click', () => moveDetail(-1));
  document.getElementById('next-char').addEventListener('click', () => moveDetail(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft') moveDetail(-1);
    if (event.key === 'ArrowRight') moveDetail(1);
  });
  window.addEventListener('resize', redrawVisible);
  renderSwatches();
  renderBlendModes();
  refreshNames();
  renderGrid();
  Promise.allSettled([ensureGoogleFont('Inter'), ensureGoogleFont('Roboto')]).then(() => {
    redrawVisible();
    setStatus('Ready to compare');
  });
}

init();
