#!/usr/bin/env python3
"""
generate_posts_json.py
======================
logs/ 以下の Markdown ファイルのフロントマターを読み込み、
data/posts.json を自動生成するスクリプト。

【使い方】
  python tools/generate_posts_json.py

【前提】
  各 Markdown ファイルの先頭に YAML フロントマター（---で囲む）を書く。

  例: logs/2026/2026-04-18-github-pages.md
  ---
  title: "GitHub Pages ログ管理サイト構想整理"
  date: "2026-04-18"
  fiscal_year: "2026"
  category: "仕事"
  subcategory: "自動化"
  tags: ["GitHub", "Notion", "自動化"]
  summary: "ログ管理WebページをGitHub Pagesで構築する構想を整理。"
  html_file: "logs/2026/2026-04-18-github-pages.html"
  ---
  ここから本文...
"""

import json
import re
import sys
from pathlib import Path

# ===== 設定 =====
SCRIPT_DIR  = Path(__file__).parent          # tools/
ROOT_DIR    = SCRIPT_DIR.parent              # サイトルート
LOGS_DIR    = ROOT_DIR / "logs"
OUTPUT_FILE = ROOT_DIR / "data" / "posts.json"

# ===== フロントマターのパース（PyYAML不要のシンプル版） =====
def parse_frontmatter(text: str) -> dict:
    """YAML フロントマターを辞書に変換する（最低限の実装）。"""
    meta = {}
    match = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not match:
        return meta
    block = match.group(1)
    for line in block.splitlines():
        line = line.strip()
        if not line or ':' not in line:
            continue
        key, _, val = line.partition(':')
        key = key.strip()
        val = val.strip().strip('"').strip("'")

        # タグ（配列）のパース
        if val.startswith('[') and val.endswith(']'):
            inner = val[1:-1]
            items = [v.strip().strip('"').strip("'") for v in inner.split(',')]
            meta[key] = [i for i in items if i]
        else:
            meta[key] = val
    return meta

# ===== Markdown から概要本文を取得 =====
def extract_body_text(text: str) -> str:
    """フロントマターを除いた本文を返す（検索用）。"""
    cleaned = re.sub(r'^---.*?---\s*', '', text, flags=re.DOTALL)
    # Markdown記法を除去
    cleaned = re.sub(r'#+\s+', '', cleaned)
    cleaned = re.sub(r'\*\*|__|\*|_|`', '', cleaned)
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)
    return cleaned.strip()

# ===== メイン処理 =====
def main():
    if not LOGS_DIR.exists():
        print(f"[ERROR] logs/ ディレクトリが見つかりません: {LOGS_DIR}")
        sys.exit(1)

    md_files = sorted(LOGS_DIR.rglob("*.md"))
    if not md_files:
        print("[WARNING] Markdown ファイルが見つかりませんでした。")
        print("  logs/ 以下に .md ファイルを作成してください。")
        sys.exit(0)

    posts = []
    errors = []

    for md_path in md_files:
        text = md_path.read_text(encoding='utf-8')
        meta = parse_frontmatter(text)

        # 必須フィールドのチェック
        required = ['title', 'date', 'fiscal_year', 'category', 'summary']
        missing = [f for f in required if f not in meta or not meta[f]]
        if missing:
            errors.append(f"  ⚠ {md_path.name}: フィールドなし → {missing}")
            continue

        # html_file が未指定の場合は自動推定
        if 'html_file' not in meta:
            html_path = md_path.with_suffix('.html')
            meta['html_file'] = str(html_path.relative_to(ROOT_DIR)).replace('\\', '/')

        post = {
            "id":          md_path.stem,
            "title":       meta.get('title', ''),
            "date":        meta.get('date', ''),
            "fiscal_year": meta.get('fiscal_year', ''),
            "category":    meta.get('category', ''),
            "subcategory": meta.get('subcategory', ''),
            "tags":        meta.get('tags', []),
            "summary":     meta.get('summary', ''),
            "url":         meta.get('html_file', ''),
        }
        posts.append(post)
        print(f"  ✓ {md_path.name}")

    # 日付降順ソート
    posts.sort(key=lambda p: p['date'], reverse=True)

    # 書き出し
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    print(f"\n✅ {len(posts)} 件を {OUTPUT_FILE} に書き出しました。")
    if errors:
        print("\n--- スキップしたファイル ---")
        for e in errors:
            print(e)

if __name__ == '__main__':
    main()
