/**
 * IssueSearchManager — DOM (happy-dom) 経由のテスト
 *
 * 既存の `search-manager.test.ts` は `getAttribute` だけスタブした
 * fake オブジェクトでフィルタロジックを検証していたが、
 * `initializeEventListeners()` 配下の DOM 連携 (input/change ハンドラ、
 * `updateDisplay`、`highlightSearchTerms`、`updateResultsInfo` 等) は
 * 一切実行されておらず行カバレージが 38% 止まりだった。
 *
 * 本テストは happy-dom 上で実 DOM を構築し、`addEventListener` で登録
 * された各ハンドラを `dispatchEvent` 経由で発火させて副作用を検証する。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IssueSearchManager } from '../search-manager';

interface IssueSpec {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low' | '';
  created?: string;
  updated?: string;
}

const buildIssueCard = (spec: IssueSpec): HTMLElement => {
  const div = document.createElement('div');
  div.className = 'issue-card';
  div.setAttribute('data-number', String(spec.number));
  div.setAttribute('data-title', spec.title);
  div.setAttribute('data-body', spec.body ?? '');
  div.setAttribute('data-author', spec.author);
  div.setAttribute('data-state', spec.state);
  div.setAttribute('data-labels', (spec.labels ?? []).join(','));
  div.setAttribute('data-assignees', (spec.assignees ?? []).join(','));
  div.setAttribute('data-priority', spec.priority ?? '');
  div.setAttribute('data-created', spec.created ?? '2026-01-01T00:00:00Z');
  div.setAttribute('data-updated', spec.updated ?? '2026-01-02T00:00:00Z');

  const title = document.createElement('span');
  title.className = 'issue-title';
  title.textContent = spec.title;
  const body = document.createElement('span');
  body.className = 'issue-body';
  body.textContent = spec.body ?? '';
  div.appendChild(title);
  div.appendChild(body);

  return div;
};

const setupDom = (issues: IssueSpec[]): HTMLElement[] => {
  document.body.innerHTML = `
    <input id="search-input" />
    <button id="clear-search">×</button>
    <select id="status-filter">
      <option value="all">all</option>
      <option value="open" selected>open</option>
      <option value="closed">closed</option>
    </select>
    <select id="author-filter"><option value="">-</option></select>
    <select id="assignee-filter"><option value="">-</option></select>
    <select id="sort-select">
      <option value="created-desc" selected>created-desc</option>
      <option value="created-asc">created-asc</option>
      <option value="updated-desc">updated-desc</option>
      <option value="number-asc">number-asc</option>
      <option value="priority-desc">priority-desc</option>
      <option value="unknown-desc">unknown-desc</option>
    </select>
    <div id="issues-container"></div>
    <span id="results-count"></span>
    <span id="search-time" class="hidden"></span>
    <span id="pagination-text"></span>
    <div id="search-stats" class="hidden">
      <span id="search-performance"></span>
    </div>
    <label>
      <input type="checkbox" class="label-filter" data-category="priority" value="priority: high" />
      <span class="text-xs text-muted">(0)</span>
    </label>
    <label>
      <input type="checkbox" class="label-filter" data-category="type" value="type: bug" />
      <span class="text-xs text-muted">(0)</span>
    </label>
    <label>
      <input type="checkbox" class="label-filter" data-category="other" value="needs-review" />
      <span class="text-xs text-muted">(0)</span>
    </label>
  `;

  const container = document.getElementById('issues-container')!;
  const created = issues.map(buildIssueCard);
  created.forEach(el => container.appendChild(el));
  return created;
};

const fireInputChange = (id: string, value: string) => {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
  el.value = value;
  const evtName =
    el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text' ? 'input' : 'change';
  el.dispatchEvent(new Event(evtName, { bubbles: true }));
};

describe('IssueSearchManager — DOM integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('initializeEventListeners attaches handlers without throwing', () => {
    setupDom([{ number: 1, title: 'A', author: 'u1', state: 'open', labels: ['bug'] }]);
    const m = new IssueSearchManager('.issue-card');
    expect(() => m.initializeEventListeners()).not.toThrow();
  });

  it('initializeEventListeners is a no-op when expected DOM elements are missing', () => {
    document.body.innerHTML = ''; // No #search-input etc.
    const m = new IssueSearchManager('.issue-card');
    expect(() => m.initializeEventListeners()).not.toThrow();
  });

  it('search input updates query after debounce and updates results-count', () => {
    setupDom([
      { number: 1, title: 'fix authentication bug', author: 'a', state: 'open' },
      { number: 2, title: 'feat: add reports', author: 'b', state: 'open' },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    fireInputChange('search-input', 'authentication');
    vi.advanceTimersByTime(310); // > 300ms debounce

    const result = m.performSearch();
    expect(result.totalCount).toBe(1);
    expect(document.getElementById('results-count')!.textContent).toContain('件の Issue を表示中');
  });

  it('clear-search button resets the query', () => {
    setupDom([{ number: 1, title: 'foo', author: 'a', state: 'open' }]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    fireInputChange('search-input', 'no-match');
    vi.advanceTimersByTime(310);
    expect(m.performSearch().totalCount).toBe(0);

    document.getElementById('clear-search')!.dispatchEvent(new Event('click', { bubbles: true }));

    expect((document.getElementById('search-input') as HTMLInputElement).value).toBe('');
    expect(m.performSearch().totalCount).toBe(1);
  });

  it('status-filter change toggles state filter and refreshes label counts', () => {
    setupDom([
      { number: 1, title: 'A', author: 'a', state: 'open', labels: ['priority: high'] },
      { number: 2, title: 'B', author: 'b', state: 'closed', labels: ['priority: high'] },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    fireInputChange('status-filter', 'all');
    expect(m.performSearch().totalCount).toBe(2);

    fireInputChange('status-filter', 'closed');
    expect(m.performSearch().totalCount).toBe(1);
    expect(m.performSearch().filteredElements[0]!.getAttribute('data-state')).toBe('closed');
  });

  it('label-filter change AND-combines categories', () => {
    setupDom([
      {
        number: 1,
        title: 'A',
        author: 'a',
        state: 'open',
        labels: ['priority: high', 'type: bug'],
      },
      {
        number: 2,
        title: 'B',
        author: 'b',
        state: 'open',
        labels: ['priority: high'],
      },
      {
        number: 3,
        title: 'C',
        author: 'c',
        state: 'open',
        labels: ['type: bug'],
      },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    const priorityCheckbox = document.querySelector(
      '.label-filter[data-category="priority"]'
    ) as HTMLInputElement;
    const typeCheckbox = document.querySelector(
      '.label-filter[data-category="type"]'
    ) as HTMLInputElement;

    priorityCheckbox.checked = true;
    priorityCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(m.performSearch().totalCount).toBe(2);

    typeCheckbox.checked = true;
    typeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    // Both priority AND type required → only #1 matches
    expect(m.performSearch().totalCount).toBe(1);
    expect(m.performSearch().filteredElements[0]!.getAttribute('data-number')).toBe('1');
  });

  it('author-filter set / clear toggles author constraint', () => {
    setupDom([
      { number: 1, title: 'A', author: 'alice', state: 'open' },
      { number: 2, title: 'B', author: 'bob', state: 'open' },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    const sel = document.getElementById('author-filter') as HTMLSelectElement;
    sel.innerHTML = '<option value=""></option><option value="alice">alice</option>';

    fireInputChange('author-filter', 'alice');
    expect(m.performSearch().totalCount).toBe(1);

    fireInputChange('author-filter', '');
    expect(m.performSearch().totalCount).toBe(2);
  });

  it('assignee-filter matches when issue assignees include the value', () => {
    setupDom([
      { number: 1, title: 'A', author: 'a', state: 'open', assignees: ['alice', 'bob'] },
      { number: 2, title: 'B', author: 'b', state: 'open', assignees: ['carol'] },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    const sel = document.getElementById('assignee-filter') as HTMLSelectElement;
    sel.innerHTML = '<option value=""></option><option value="bob">bob</option>';

    fireInputChange('assignee-filter', 'bob');
    expect(m.performSearch().totalCount).toBe(1);
    expect(m.performSearch().filteredElements[0]!.getAttribute('data-number')).toBe('1');
  });

  it('sort-select supports created/updated/number/priority and unknown sort key', () => {
    setupDom([
      {
        number: 1,
        title: 'X',
        author: 'a',
        state: 'open',
        priority: 'low',
        created: '2026-01-01T00:00:00Z',
        updated: '2026-02-01T00:00:00Z',
      },
      {
        number: 2,
        title: 'Y',
        author: 'b',
        state: 'open',
        priority: 'critical',
        created: '2026-03-01T00:00:00Z',
        updated: '2026-01-15T00:00:00Z',
      },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    fireInputChange('sort-select', 'created-asc');
    expect(m.performSearch().filteredElements.map(el => el.getAttribute('data-number'))).toEqual([
      '1',
      '2',
    ]);

    fireInputChange('sort-select', 'updated-desc');
    expect(m.performSearch().filteredElements.map(el => el.getAttribute('data-number'))).toEqual([
      '1',
      '2',
    ]);

    fireInputChange('sort-select', 'number-asc');
    expect(m.performSearch().filteredElements.map(el => el.getAttribute('data-number'))).toEqual([
      '1',
      '2',
    ]);

    fireInputChange('sort-select', 'priority-desc');
    expect(m.performSearch().filteredElements.map(el => el.getAttribute('data-number'))).toEqual([
      '2',
      '1',
    ]);

    // 不明な sort key は default ブランチを通り、現在の順序が保持される
    fireInputChange('sort-select', 'unknown-desc');
    expect(m.performSearch().filteredElements).toHaveLength(2);
  });

  it('updateLabelCounts updates label count chips', () => {
    setupDom([
      { number: 1, title: 'A', author: 'a', state: 'open', labels: ['priority: high'] },
      { number: 2, title: 'B', author: 'b', state: 'open', labels: ['priority: high'] },
      { number: 3, title: 'C', author: 'c', state: 'closed', labels: ['priority: high'] },
    ]);
    const m = new IssueSearchManager('.issue-card');

    m.updateLabelCounts();
    const chip = document
      .querySelector('.label-filter[data-category="priority"]')!
      .parentElement!.querySelector('.text-xs.text-muted')!;
    expect(chip.textContent).toBe('(2)'); // open のみ

    fireInputChange('status-filter', 'all');
    m.initializeEventListeners();
    fireInputChange('status-filter', 'all');
    expect(chip.textContent).toBe('(3)'); // open + closed
  });

  it('highlights search terms with regex-escaped special chars', () => {
    setupDom([
      { number: 1, title: 'fix (auth) issue', body: 'auth fails', author: 'a', state: 'open' },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    fireInputChange('search-input', '(auth)');
    vi.advanceTimersByTime(310);

    const titleEl = document.querySelector('.issue-title') as HTMLElement;
    expect(titleEl.innerHTML).toContain('search-highlight');
  });

  it('updates pagination text and search-stats visibility based on filters', () => {
    setupDom([
      { number: 1, title: 'A', author: 'a', state: 'open' },
      { number: 2, title: 'B', author: 'b', state: 'open' },
    ]);
    const m = new IssueSearchManager('.issue-card');
    m.initializeEventListeners();

    // No active filter → search-stats hidden, pagination shows total
    fireInputChange('status-filter', 'all');
    const stats = document.getElementById('search-stats')!;
    const pagination = document.getElementById('pagination-text')!;
    expect(stats.classList.contains('hidden')).toBe(true);
    expect(pagination.textContent).toContain('2 件の Issue を表示中');

    // Apply a query → search-stats becomes visible
    fireInputChange('search-input', 'A');
    vi.advanceTimersByTime(310);
    expect(stats.classList.contains('hidden')).toBe(false);
  });
});
