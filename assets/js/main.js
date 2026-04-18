// ===== ログ管理 main.js =====

let allPosts = [];
let categoriesData = { categories: [] };

let filters = {
  keyword: '',
  category: '',
  subcategory: '',
  year: '',
  tag: ''
};

// ===== データ読み込み =====
async function loadData() {
  try {
    const [postsRes, catsRes] = await Promise.all([
      fetch('data/posts.json'),
      fetch('data/categories.json')
    ]);
    if (!postsRes.ok || !catsRes.ok) throw new Error('fetch failed');
    allPosts = await postsRes.json();
    categoriesData = await catsRes.json();

    initFilters();
    renderPosts(allPosts);
  } catch (e) {
    document.getElementById('post-list').innerHTML = `
      <div class="empty-state">
        ⚠️ データの読み込みに失敗しました。<br><br>
        <strong>ローカルで確認する場合</strong>は、VS Code の Live Server か、<br>
        <code>python -m http.server 8000</code> で起動してください。<br><br>
        GitHub Pages にデプロイすれば正常に動作します。
      </div>`;
  }
}

// ===== フィルター初期化 =====
function initFilters() {
  // 大分類
  const catSelect = document.getElementById('filter-category');
  const cats = [...new Set(allPosts.map(p => p.category))].sort();
  cats.forEach(c => addOption(catSelect, c, c));

  // 年度（新しい順）
  const yearSelect = document.getElementById('filter-year');
  const years = [...new Set(allPosts.map(p => p.fiscal_year))].sort().reverse();
  years.forEach(y => addOption(yearSelect, y, `${y}年度`));

  // タグ（全記事のタグをまとめてソート）
  const tagSelect = document.getElementById('filter-tag');
  const tags = [...new Set(allPosts.flatMap(p => p.tags))].sort();
  tags.forEach(t => addOption(tagSelect, t, t));

  // 中分類（初期は全件）
  refreshSubcategoryOptions('');
}

function addOption(select, value, text) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  select.appendChild(opt);
}

// 中分類を大分類連動で更新
function refreshSubcategoryOptions(category) {
  const subSelect = document.getElementById('filter-subcategory');
  const currentVal = subSelect.value;
  subSelect.innerHTML = '<option value="">📂 中分類</option>';

  let subs = [];
  if (category) {
    const found = categoriesData.categories.find(c => c.name === category);
    if (found) subs = found.subcategories;
  } else {
    subs = [...new Set(allPosts.map(p => p.subcategory).filter(Boolean))].sort();
  }

  subs.forEach(s => addOption(subSelect, s, s));

  // 前の値が選択肢にあれば維持
  if (subs.includes(currentVal)) subSelect.value = currentVal;
}

// ===== フィルタリング =====
function applyFilters() {
  const kw = filters.keyword.toLowerCase().trim();
  return allPosts.filter(post => {
    if (kw) {
      const blob = [post.title, post.summary, post.body || '', ...post.tags]
        .join(' ').toLowerCase();
      if (!blob.includes(kw)) return false;
    }
    if (filters.category && post.category !== filters.category) return false;
    if (filters.subcategory && post.subcategory !== filters.subcategory) return false;
    if (filters.year && post.fiscal_year !== filters.year) return false;
    if (filters.tag && !post.tags.includes(filters.tag)) return false;
    return true;
  });
}

// ===== カテゴリカラーマップ =====
const CAT_COLOR = {
  '仕事':      { bg: '#dbeafe', text: '#2563eb' },
  '趣味':      { bg: '#dcfce7', text: '#16a34a' },
  '地区活動':  { bg: '#ffedd5', text: '#ea580c' },
  '家族':      { bg: '#fce7f3', text: '#db2777' },
  '学習':      { bg: '#ede9fe', text: '#7c3aed' },
  '健康':      { bg: '#cffafe', text: '#0891b2' },
  'ランニング':{ bg: '#fee2e2', text: '#dc2626' },
  'HINOVA':    { bg: '#e0e7ff', text: '#4f46e5' },
  'Terrace J': { bg: '#fef3c7', text: '#d97706' },
  'その他':    { bg: '#f1f5f9', text: '#6b7280' },
};

function catStyle(cat) {
  const c = CAT_COLOR[cat] || { bg: '#f1f5f9', text: '#6b7280' };
  return `background:${c.bg};color:${c.text}`;
}

// ===== 一覧描画 =====
function renderPosts(posts) {
  const list = document.getElementById('post-list');
  const countEl = document.getElementById('results-count');

  // 日付降順ソート
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));

  countEl.textContent = `${sorted.length} 件の記録`;

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state">条件に一致する記録が見つかりませんでした。<br>検索条件を変えてみてください。</div>';
    return;
  }

  list.innerHTML = sorted.map(post => {
    const tags = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const sub  = post.subcategory ? `<span class="badge badge-sub">${post.subcategory}</span>` : '';
    return `
      <a href="${post.url}" class="post-card">
        <div class="post-card-top">
          <span class="post-date">${post.date}</span>
          <span class="post-title">${post.title}</span>
        </div>
        <div class="post-meta">
          <span class="badge" style="${catStyle(post.category)}">${post.category}</span>
          ${sub}
          <span class="badge badge-year">${post.fiscal_year}年度</span>
        </div>
        <p class="post-summary">${post.summary}</p>
        <div class="post-tags">${tags}</div>
      </a>`;
  }).join('');
}

// ===== アクティブフィルター表示 =====
function renderActiveFilters() {
  const container = document.getElementById('active-filters');
  const chips = [];
  if (filters.keyword)    chips.push(`🔍 ${filters.keyword}`);
  if (filters.category)   chips.push(`📁 ${filters.category}`);
  if (filters.subcategory)chips.push(`📂 ${filters.subcategory}`);
  if (filters.year)       chips.push(`📅 ${filters.year}年度`);
  if (filters.tag)        chips.push(`🏷️ ${filters.tag}`);
  container.innerHTML = chips.map(c =>
    `<span class="filter-chip">${c}</span>`
  ).join('');
}

function refreshView() {
  renderActiveFilters();
  renderPosts(applyFilters());
}

function resetAllFilters() {
  filters = { keyword: '', category: '', subcategory: '', year: '', tag: '' };
  document.getElementById('search-input').value = '';
  document.getElementById('filter-category').value    = '';
  document.getElementById('filter-subcategory').value = '';
  document.getElementById('filter-year').value        = '';
  document.getElementById('filter-tag').value         = '';
  refreshSubcategoryOptions('');
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
  refreshView();
}

// ===== イベント登録 =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // キーワード検索
  document.getElementById('search-input').addEventListener('input', e => {
    filters.keyword = e.target.value;
    refreshView();
  });

  // 大分類
  document.getElementById('filter-category').addEventListener('change', e => {
    filters.category    = e.target.value;
    filters.subcategory = '';
    refreshSubcategoryOptions(e.target.value);
    refreshView();
  });

  // 中分類
  document.getElementById('filter-subcategory').addEventListener('change', e => {
    filters.subcategory = e.target.value;
    refreshView();
  });

  // 年度
  document.getElementById('filter-year').addEventListener('change', e => {
    filters.year = e.target.value;
    refreshView();
  });

  // タグ
  document.getElementById('filter-tag').addEventListener('change', e => {
    filters.tag = e.target.value;
    refreshView();
  });

  // クリア
  document.getElementById('clear-filters').addEventListener('click', resetAllFilters);

  // クイックナビ
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.reset !== undefined) {
        resetAllFilters();
        return;
      }

      if (btn.dataset.recent !== undefined) {
        // 全フィルタをリセットして最新10件だけ表示
        filters = { keyword: '', category: '', subcategory: '', year: '', tag: '' };
        document.getElementById('search-input').value = '';
        document.getElementById('filter-category').value    = '';
        document.getElementById('filter-subcategory').value = '';
        document.getElementById('filter-year').value        = '';
        document.getElementById('filter-tag').value         = '';
        refreshSubcategoryOptions('');
        renderActiveFilters();
        const recent = [...allPosts]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10);
        document.getElementById('results-count').textContent = '最近の記録（最新10件）';
        renderPosts(recent);
        return;
      }

      if (btn.dataset.category) {
        // 大分類でフィルタ（他はリセット）
        filters = {
          keyword: '', category: btn.dataset.category,
          subcategory: '', year: '', tag: ''
        };
        document.getElementById('search-input').value = '';
        document.getElementById('filter-category').value    = btn.dataset.category;
        document.getElementById('filter-subcategory').value = '';
        document.getElementById('filter-year').value        = '';
        document.getElementById('filter-tag').value         = '';
        refreshSubcategoryOptions(btn.dataset.category);
        refreshView();
      }
    });
  });
});
