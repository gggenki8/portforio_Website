// ── 状態 ──
let state = {
  auth:     {},
  works:    [],
  profile:  {},
  links:    [],
  activity: [],
  inquiries: [],
  skills: [],
};

// ── 初期化 ──
async function init() {
  const data = await loadAll();
  state.auth     = data.auth;
  state.works    = data.works;
  state.profile  = data.profile;
  state.links    = data.links;
  state.activity = data.activity;

  if (sessionStorage.getItem('mp-logged-in') === 'true') {
    showApp();
  }

  document.getElementById('loginPass')
    .addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

// ── ログイン ──
function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');

  if (u === state.auth.username && p === state.auth.password) {
    sessionStorage.setItem('mp-logged-in', 'true');
    addActivity('ログインしました');
    showApp();
  } else {
    errEl.textContent = 'ユーザー名またはパスワードが違います';
    setTimeout(() => errEl.textContent = '', 2500);
  }
}

function doLogout() {
  sessionStorage.removeItem('mp-logged-in');
  location.reload();
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mpWrap').style.display = 'grid';
  refreshAll();
}

// ── パネル切り替え ──
function switchPanel(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');
  if (id === 'security') {
    document.getElementById('cur-username').value = state.auth.username;
  }
  if (id === 'inquiries') {
    loadInquiries();
  }
  if (id === 'skills') {
    loadSkills();
  }
}

// ── 全体リフレッシュ ──
function refreshAll() {
  const name = state.profile.name || state.auth.username;
  document.getElementById('sidebarName').textContent   = name;
  document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();

  const now = new Date();
  document.getElementById('dashDate').textContent =
    now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  document.getElementById('dashGreeting').textContent =
    'WELCOME BACK, ' + name.toUpperCase();

  updateDashStats();
  renderActivity();
  renderWorksTable();

  document.getElementById('prof-name').value  = state.profile.name  || '';
  document.getElementById('prof-catch').value = state.profile.catch || '';
  document.getElementById('prof-bio').value   = state.profile.bio   || '';
  document.getElementById('prof-email').value = state.profile.email || '';
  document.getElementById('cur-username').value = state.auth.username;

  renderLinks();
}

// ── ダッシュボード統計 ──
function updateDashStats() {
  document.getElementById('dashWorks').textContent  = state.works.length;
  document.getElementById('dashPublic').textContent =
    state.works.filter(w => w.status === '公開中').length;
  document.getElementById('dashLinks').textContent  = state.links.length;
  document.getElementById('dashUpdated').textContent =
    state.activity.length ? state.activity[0].time.slice(5, 10) : '—';
    const unread = state.inquiries.filter(q => !q.read).length;
    const unreadEl = document.getElementById('dashUnread');
    if (unreadEl) {
      unreadEl.textContent = unread;
      unreadEl.style.color = unread > 0 ? '#ffaa00' : 'var(--accent)';
    }
}

// ── Works ──
function renderWorksTable() {
  const tbody = document.getElementById('worksTbody');
  document.getElementById('worksCount').textContent = state.works.length + '件';

  if (!state.works.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--muted);
          font-family:var(--mono);font-size:.75rem;padding:2rem;">
          実績なし
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = state.works.map(w => `
    <tr>
      <td>
        <div class="td-title">${esc(w.title)}</div>
        <div class="td-desc">${esc(w.desc)}</div>
        <div class="tags-row">
          ${(w.tags || []).map(t => `<span class="tag-sm">${esc(t)}</span>`).join('')}
        </div>
      </td>
      <td class="td-url">
        ${w.url
          ? `<a href="${esc(w.url)}" target="_blank">→ 開く</a>`
          : '<span class="no-url">未設定</span>'}
      </td>
      <td>
        <span class="badge-status ${badgeClass(w.status)}">${esc(w.status)}</span>
      </td>
      <td style="display:flex;flex-direction:column;gap:.4rem;">
        <button class="mp-btn mp-btn-primary"
          style="padding:.3rem .7rem;font-size:.62rem;"
          onclick="editWork(${w.id})">編集</button>
        <button class="mp-btn mp-btn-danger"
          style="padding:.3rem .7rem;font-size:.62rem;"
          onclick="deleteWork(${w.id})">削除</button>
      </td>
    </tr>
  `).join('');
}

function badgeClass(status) {
  if (status === '公開中') return 'badge-active';
  if (status === '進行中') return 'badge-wip';
  return 'badge-done';
}

async function addWork() {
  const title  = document.getElementById('w-title').value.trim();
  const desc   = document.getElementById('w-desc').value.trim();
  const tags   = document.getElementById('w-tags').value
                   .split(',').map(t => t.trim()).filter(Boolean);
  const status = document.getElementById('w-status').value;
  const url    = document.getElementById('w-url').value.trim();

  if (!title || !desc) {
    toast('タイトルと説明文を入力してください', true);
    return;
  }

  state.works.push({ id: Date.now(), title, desc, tags, status, url });
  await saveData('works', state.works, true);

  renderWorksTable();
  updateDashStats();
  addActivity(`Works追加：${title}`);
  ['w-title', 'w-desc', 'w-tags', 'w-url'].forEach(id => {
    document.getElementById(id).value = '';
  });
  toast('実績を追加しました');
}

async function deleteWork(id) {
  if (!confirm('この実績を削除しますか？')) return;
  const w = state.works.find(x => x.id === id);
  state.works = state.works.filter(x => x.id !== id);
  await saveData('works', state.works, true);

  renderWorksTable();
  updateDashStats();
  if (w) addActivity(`Works削除：${w.title}`);
  toast('削除しました');
}

// ── Works編集 ──
function editWork(id) {
  const w = state.works.find(x => x.id === id);
  if (!w) return;

  document.getElementById('w-title').value  = w.title;
  document.getElementById('w-desc').value   = w.desc;
  document.getElementById('w-tags').value   = (w.tags || []).join(', ');
  document.getElementById('w-status').value = w.status;
  document.getElementById('w-url').value    = w.url || '';

  const btn = document.querySelector('#panel-works .mp-btn-primary');
  btn.textContent = '更新する →';
  btn.onclick = () => updateWork(id);

  document.getElementById('w-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('編集モード：内容を変更して更新してください');
}

async function updateWork(id) {
  const title  = document.getElementById('w-title').value.trim();
  const desc   = document.getElementById('w-desc').value.trim();
  const tags   = document.getElementById('w-tags').value
                   .split(',').map(t => t.trim()).filter(Boolean);
  const status = document.getElementById('w-status').value;
  const url    = document.getElementById('w-url').value.trim();

  if (!title || !desc) {
    toast('タイトルと説明文を入力してください', true);
    return;
  }

  state.works = state.works.map(w =>
    w.id === id ? { ...w, title, desc, tags, status, url } : w
  );
  await saveData('works', state.works, true);

  renderWorksTable();
  updateDashStats();
  addActivity(`Works更新：${title}`);

  ['w-title', 'w-desc', 'w-tags', 'w-url'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const btn = document.querySelector('#panel-works .mp-btn-primary');
  btn.textContent = '追加する →';
  btn.onclick = addWork;

  toast('更新しました');
}

// ── プロフィール ──
async function saveProfile() {
  state.profile = {
    name:  document.getElementById('prof-name').value.trim(),
    catch: document.getElementById('prof-catch').value.trim(),
    bio:   document.getElementById('prof-bio').value.trim(),
    email: document.getElementById('prof-email').value.trim(),
  };
  await saveData('profile', state.profile, false);

  const name = state.profile.name || state.auth.username;
  document.getElementById('sidebarName').textContent   = name;
  document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();

  addActivity('プロフィールを更新しました');
  toast('プロフィールを保存しました');
}

// ── セキュリティ ──
async function changeUsername() {
  const newU = document.getElementById('new-username').value.trim();
  if (!newU) { toast('新しいユーザー名を入力してください', true); return; }

  state.auth.username = newU;
  await saveData('auth', state.auth, false);

  document.getElementById('cur-username').value = newU;
  document.getElementById('new-username').value = '';
  addActivity('ユーザー名を変更しました');
  toast('ユーザー名を変更しました');
}

async function changePassword() {
  const cur  = document.getElementById('cur-pass').value;
  const np   = document.getElementById('new-pass').value;
  const np2  = document.getElementById('new-pass2').value;

  if (cur !== state.auth.password) { toast('現在のパスワードが違います', true); return; }
  if (np.length < 4)               { toast('4文字以上のパスワードを設定してください', true); return; }
  if (np !== np2)                   { toast('新しいパスワードが一致しません', true); return; }

  state.auth.password = np;
  await saveData('auth', state.auth, false);

  ['cur-pass', 'new-pass', 'new-pass2'].forEach(id => {
    document.getElementById(id).value = '';
  });
  addActivity('パスワードを変更しました');
  toast('パスワードを変更しました');
}

// ── 外部リンク ──
function renderLinks() {
  const el = document.getElementById('linksList');
  document.getElementById('dashLinks').textContent = state.links.length;

  if (!state.links.length) {
    el.innerHTML = '<div style="font-family:var(--mono);font-size:.75rem;color:var(--muted);">リンクなし</div>';
    return;
  }

  el.innerHTML = state.links.map(l => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:.7rem 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-family:var(--mono);font-size:.78rem;">${esc(l.label)}</div>
        <a href="${esc(l.url)}" target="_blank"
          style="font-family:var(--mono);font-size:.65rem;color:var(--accent2);text-decoration:none;">
          ${esc(l.url)}
        </a>
      </div>
      <button class="mp-btn mp-btn-danger"
        style="padding:.3rem .7rem;font-size:.62rem;"
        onclick="deleteLink(${l.id})">削除</button>
    </div>
  `).join('');
}

async function addLink() {
  const label = document.getElementById('link-label').value.trim();
  const url   = document.getElementById('link-url').value.trim();
  if (!label || !url) { toast('ラベルとURLを入力してください', true); return; }

  state.links.push({ id: Date.now(), label, url });
  await saveData('links', state.links, false);

  renderLinks();
  updateDashStats();
  addActivity(`リンク追加：${label}`);
  document.getElementById('link-label').value = '';
  document.getElementById('link-url').value   = '';
  toast('リンクを追加しました');
}

async function deleteLink(id) {
  state.links = state.links.filter(l => l.id !== id);
  await saveData('links', state.links, false);

  renderLinks();
  updateDashStats();
  toast('削除しました');
}

// ── アクティビティログ ──
async function addActivity(text) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now).replace(/\//g, '-');

  state.activity.unshift({ text, time });
  if (state.activity.length > 20) state.activity = state.activity.slice(0, 20);
  await saveData('activity', state.activity, false);

  renderActivity();
  updateDashStats();
}

function renderActivity() {
  const el = document.getElementById('activityLog');
  if (!state.activity.length) {
    el.innerHTML = '<div style="font-family:var(--mono);font-size:.75rem;color:var(--muted);">ログなし</div>';
    return;
  }
  el.innerHTML = state.activity.slice(0, 8).map(a => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div>
        <div class="log-text">${esc(a.text)}</div>
        <div class="log-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

// ── お問い合わせ ──
async function loadInquiries() {
  const data = await loadData('inquiries', true) ?? [];
  state.inquiries = data;
  renderInquiries();
  updateDashStats(); 
}

function renderInquiries() {
  const list = document.getElementById('inquiriesList');
  const count = document.getElementById('inquiriesCount');
  if (!list) return;

  const data = state.inquiries ?? [];
  if (count) count.textContent = data.length + '件';

  if (!data.length) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:.75rem;color:var(--muted);">問い合わせなし</div>';
    return;
  }

  list.innerHTML = data.map(q => `
    <div style="padding:1.2rem 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
        <div style="display:flex;align-items:center;gap:.5rem;">
          ${!q.read ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffaa00;flex-shrink:0;"></span>' : ''}
          <div style="font-family:var(--mono);font-size:.78rem;color:var(--text);">${esc(q.name)}
            <span style="color:var(--muted);font-size:.65rem;margin-left:.5rem;">&lt;${esc(q.email)}&gt;</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0;">
          <div style="font-family:var(--mono);font-size:.63rem;color:var(--muted);">${q.time}</div>
          ${!q.read ? `<button class="mp-btn mp-btn-primary" style="padding:.2rem .6rem;font-size:.6rem;" onclick="markRead(${q.id})">既読</button>` : '<span style="font-family:var(--mono);font-size:.6rem;color:var(--muted);">既読</span>'}
        </div>
      </div>
      <div style="font-size:.82rem;color:var(--muted);line-height:1.7;white-space:pre-wrap;margin-bottom:.8rem;">${esc(q.message)}</div>
      <div style="margin-bottom:.5rem;">
        <label style="font-family:var(--mono);font-size:.63rem;color:var(--muted);letter-spacing:.1em;">MEMO</label>
        <textarea style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--sans);font-size:.8rem;padding:.5rem .7rem;margin-top:.3rem;border-radius:2px;resize:vertical;outline:none;box-sizing:border-box;"
          rows="2" placeholder="対応状況・メモを入力..."
          onchange="saveMemo(${q.id}, this.value)">${esc(q.memo || '')}</textarea>
      </div>
      <div style="margin-top:.3rem;">
        <button class="mp-btn mp-btn-danger" style="padding:.3rem .7rem;font-size:.62rem;"
          onclick="deleteInquiry(${q.id})">削除</button>
      </div>
    </div>
  `).join('');
}

async function deleteInquiry(id) {
  if (!confirm('この問い合わせを削除しますか？')) return;
  state.inquiries = state.inquiries.filter(q => q.id !== id);
  await saveData('inquiries', state.inquiries, true);
  renderInquiries();
  toast('削除しました');
}

async function markRead(id) {
  state.inquiries = state.inquiries.map(q =>
    q.id === id ? { ...q, read: true } : q
  );
  await saveData('inquiries', state.inquiries, true);
  renderInquiries();
  updateDashStats();
  toast('既読にしました');
}

// ── メモ保存 ──
async function saveMemo(id, value) {
  state.inquiries = state.inquiries.map(q =>
    q.id === id ? { ...q, memo: value } : q
  );
  await saveData('inquiries', state.inquiries, true);
  toast('メモを保存しました');
}

// ── スキル ──
async function loadSkills() {
  const data = await loadData('skills') ?? null;
  state.skills = data ?? DEFAULTS_SKILLS;
  renderSkillsList();
}

function renderSkillsList() {
  const el = document.getElementById('skillsList');
  const count = document.getElementById('skillsCount');
  if (!el) return;

  const data = state.skills ?? [];
  if (count) count.textContent = data.length + '件';

  if (!data.length) {
    el.innerHTML = '<div style="font-family:var(--mono);font-size:.75rem;color:var(--muted);">スキルなし</div>';
    return;
  }

  el.innerHTML = data.map(s => `
    <div style="padding:1.2rem 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
      <div style="min-width:0;">
        <div style="font-family:var(--mono);font-size:.68rem;color:var(--accent);margin-bottom:.3rem;">[ ${esc(s.icon)} ]</div>
        <div style="font-family:var(--mono);font-size:.78rem;color:var(--text);margin-bottom:.3rem;">${esc(s.name)}</div>
        <div style="font-size:.76rem;color:var(--muted);line-height:1.6;margin-bottom:.4rem;">${esc(s.desc)}</div>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap;">
          ${(s.tags||[]).map(t => `<span class="tag-sm">${esc(t)}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0;">
        <button class="mp-btn mp-btn-primary" style="padding:.3rem .7rem;font-size:.62rem;"
          onclick="editSkill(${s.id})">編集</button>
        <button class="mp-btn mp-btn-danger" style="padding:.3rem .7rem;font-size:.62rem;"
          onclick="deleteSkill(${s.id})">削除</button>
      </div>
    </div>
  `).join('');
}

async function addSkill() {
  const icon = document.getElementById('sk-icon').value.trim();
  const name = document.getElementById('sk-name').value.trim();
  const desc = document.getElementById('sk-desc').value.trim();
  const tags = document.getElementById('sk-tags').value
                 .split(',').map(t => t.trim()).filter(Boolean);

  if (!icon || !name || !desc) {
    toast('カテゴリ・スキル名・説明文を入力してください', true);
    return;
  }

  state.skills.push({ id: Date.now(), icon, name, desc, tags });
  await saveData('skills', state.skills);

  renderSkillsList();
  addActivity(`スキル追加：${name}`);
  ['sk-icon', 'sk-name', 'sk-desc', 'sk-tags'].forEach(id => {
    document.getElementById(id).value = '';
  });
  toast('スキルを追加しました');
}

async function deleteSkill(id) {
  if (!confirm('このスキルを削除しますか？')) return;
  const s = state.skills.find(x => x.id === id);
  state.skills = state.skills.filter(x => x.id !== id);
  await saveData('skills', state.skills);

  renderSkillsList();
  if (s) addActivity(`スキル削除：${s.name}`);
  toast('削除しました');
}

// ── スキル編集 ──
function editSkill(id) {
  const s = state.skills.find(x => x.id === id);
  if (!s) return;

  document.getElementById('sk-icon').value = s.icon;
  document.getElementById('sk-name').value = s.name;
  document.getElementById('sk-desc').value = s.desc;
  document.getElementById('sk-tags').value = (s.tags || []).join(', ');

  const btn = document.querySelector('#panel-skills .mp-btn-primary');
  btn.textContent = '更新する →';
  btn.onclick = () => updateSkill(id);

  document.getElementById('sk-icon').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('編集モード：内容を変更して更新してください');
}

async function updateSkill(id) {
  const icon = document.getElementById('sk-icon').value.trim();
  const name = document.getElementById('sk-name').value.trim();
  const desc = document.getElementById('sk-desc').value.trim();
  const tags = document.getElementById('sk-tags').value
                 .split(',').map(t => t.trim()).filter(Boolean);

  if (!icon || !name || !desc) {
    toast('カテゴリ・スキル名・説明文を入力してください', true);
    return;
  }

  state.skills = state.skills.map(s =>
    s.id === id ? { ...s, icon, name, desc, tags } : s
  );
  await saveData('skills', state.skills);

  renderSkillsList();
  addActivity(`スキル更新：${name}`);

  ['sk-icon', 'sk-name', 'sk-desc', 'sk-tags'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const btn = document.querySelector('#panel-skills .mp-btn-primary');
  btn.textContent = '追加する →';
  btn.onclick = addSkill;

  toast('更新しました');
}
// ── 起動 ──
document.addEventListener('DOMContentLoaded', init);