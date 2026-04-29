// ── ストレージキー ──
const KEYS = {
  auth:     'gen888-auth',
  works:    'gen888-works',
  profile:  'gen888-profile',
  links:    'gen888-links',
  activity: 'gen888-activity',
};

// ── デフォルトデータ ──
const DEFAULTS = {
  auth: {
    username: 'gen888',
    password: '0000',
  },

  works: [
    {
      id: 1,
      title: 'AIチャットボット（Streamlit）',
      desc: 'OpenAI APIを使ったカスタムAIチャットボット。会話履歴保持・プロンプトカスタマイズ対応。Streamlit Cloudで公開済み。',
      tags: ['Python', 'OpenAI', 'Streamlit'],
      status: '公開中',
      url: '',
    },
    {
      id: 2,
      title: 'お問い合わせ自動分類フロー（n8n × OpenAI）',
      desc: 'フォームへの問い合わせをAIが自動分類し担当者に振り分けるn8nワークフロー。Zennで解説記事も公開。',
      tags: ['n8n', 'OpenAI', '自動化'],
      status: '公開中',
      url: '',
    },
    {
      id: 3,
      title: 'n8n 自動化フロー ×2本',
      desc: '業務効率化のためのn8n自動化フローを2本構築。APIトリガーによるデータ処理・通知自動化を実現。',
      tags: ['n8n', 'Webhook', '自動化'],
      status: '完成',
      url: '',
    },
  ],

  profile: {
    name:  'gen888',
    catch: 'AIで業務を変える',
    bio:   'Python・OpenAI API・n8nを使ったAI自動化ツールの開発が得意です。「作業に時間がかかっている」「同じ作業を繰り返している」そんな課題をAIの力で解決します。',
    email: '',
  },

  links: [
    { id: 1, label: 'クラウドワークス', url: 'https://crowdworks.jp/public/employees/gen888' },
    { id: 2, label: 'Zenn',             url: 'https://zenn.dev/gen888' },
  ],

  activity: [],
};

// ── 読み込み ──
async function loadData(key, shared = false) {
  try {
    const res = await window.storage.get(KEYS[key], shared);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}

// ── 書き込み ──
async function saveData(key, value, shared = false) {
  try {
    await window.storage.set(KEYS[key], JSON.stringify(value), shared);
  } catch (e) {
    console.error(`storage.set failed [${key}]:`, e);
  }
}

// ── 全データ取得（デフォルト値フォールバック付き）──
async function loadAll() {
  const [auth, works, profile, links, activity] = await Promise.all([
    loadData('auth',     true),
    loadData('works',    true),   // Works は両ページで共有
    loadData('profile',  true),
    loadData('links',    true),
    loadData('activity', true),
  ]);

  return {
    auth:     auth     ?? DEFAULTS.auth,
    works:    works    ?? DEFAULTS.works,
    profile:  profile  ?? DEFAULTS.profile,
    links:    links    ?? DEFAULTS.links,
    activity: activity ?? DEFAULTS.activity,
  };
}

// ── ユーティリティ ──
function esc(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = isError ? 'var(--danger)' : 'var(--accent)';
  el.style.color        = isError ? 'var(--danger)' : 'var(--accent)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}