// ── 状態 ──
let state = {
  works:   [],
  profile: {},
  links:   [],
};

// ── 初期化 ──
async function init() {
  const data = await loadAll();
  state.works   = data.works;
  state.profile = data.profile;
  state.links   = data.links;

  renderProfile();
  renderWorks();
  renderLinks();
  initScrollReveal();
}

// ── プロフィールをHeroに反映 ──
function renderProfile() {
  const p = state.profile;

  // 表示名
  const nameEl = document.getElementById('heroName');
  if (nameEl) nameEl.textContent = p.name || 'gen888';

  // キャッチコピー
  const catchEl = document.getElementById('heroCatch');
  if (catchEl) catchEl.textContent = p.catch || 'AIで業務を変える';

  // 自己紹介文
  const bioEl = document.getElementById('heroBio');
  if (bioEl) bioEl.textContent = p.bio || '';

  // メールアドレス
  const emailEl = document.getElementById('contactEmail');
  if (emailEl) {
    if (p.email) {
      emailEl.textContent = p.email;
      emailEl.href = `mailto:${p.email}`;
      emailEl.style.display = 'block';
    } else {
      emailEl.style.display = 'none';
    }
  }
}

// ── Works一覧を描画 ──
function renderWorks() {
  const list = document.getElementById('worksList');
  if (!list) return;

  // ヒーローの実績数を更新
  const statEl = document.getElementById('statWorks');
  if (statEl) statEl.textContent = state.works.length + '+';

  if (!state.works.length) {
    list.innerHTML = '<div class="loading-msg">実績はまだありません</div>';
    return;
  }

  list.innerHTML = state.works.map((w, i) => `
    <div class="work-item">
      <div>
        <div class="work-num">WORK_${String(i + 1).padStart(3, '0')}</div>
        <div class="work-title">${esc(w.title)}</div>
        <p class="work-desc">${esc(w.desc)}</p>
        <div class="work-link-row">
          ${w.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        ${w.url ? `<a href="${esc(w.url)}" target="_blank" class="work-url-link">→ デモを見る</a>` : ''}
      </div>
      <span class="work-badge">${esc(w.status)}</span>
    </div>
  `).join('');
}

// ── 外部リンクをContact欄に反映 ──
function renderLinks() {
  const container = document.getElementById('contactLinks');
  if (!container) return;

  if (!state.links.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = state.links.map(l => `
    <a href="${esc(l.url)}" target="_blank" class="contact-link">
      → ${esc(l.label)}
    </a>
  `).join('');
}

// ── スクロールでフェードイン ──
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── お問い合わせフォーム ──
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.form-submit');

  const inquiry = {
    id: Date.now(),
    name: form.querySelector('input[type="text"]').value.trim(),
    email: form.querySelector('input[type="email"]').value.trim(),
    message: form.querySelector('textarea').value.trim(),
    time: new Date().toISOString().slice(0, 16).replace('T', ' '),
    read: false,
  };

  const existing = await loadData('inquiries', true) ?? [];
  existing.unshift(inquiry);
  await saveData('inquiries', existing, true);

  btn.textContent = '送信完了 ✓';
  btn.style.background = '#0088ff';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '送信する →';
    btn.style.background = '';
    btn.disabled = false;
    form.reset();
  }, 3000);
}


// ── 起動 ──
document.addEventListener('DOMContentLoaded', init);