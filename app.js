/*
 * 2차 전문가 조사 (델파이) 웹 설문 - 샘플
 * - 외부 라이브러리·CDN·분석 도구 없음 (보안 심사와 기관망 차단 위험 최소화)
 * - 화면에 넣는 모든 글자는 textContent로만 넣음 (스크립트 삽입 방지)
 * - 개인 링크의 토큰은 주소창에서 바로 지우고 탭 안에서만 보관
 * - 샘플은 이 기기 브라우저에만 임시 저장. 실제 운영에서는 Api 부분만 서버 연동으로 교체
 */
(() => {
  'use strict';

  const S = window.SURVEY;
  const META = S.meta;
  const C = S.criteria;
  const N = C.length;
  const CID = C.map(c => c.id);
  const PAIRS = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);
  const pkey = (i, j) => CID[i] + CID[j];
  const RI = { 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45 };
  const P1_LABELS = ['전혀 적절하지 않음', '적절하지 않음', '보통', '적절함', '매우 적절함'];
  const INT_SHORT = { 2: '', 3: '약간', 4: '', 5: '중요', 6: '', 7: '매우', 8: '', 9: '극히' };
  const INT_NAME = { 2: '동등~약간 중요 사이', 3: '약간 중요', 4: '약간 중요~중요 사이', 5: '중요', 6: '중요~매우 중요 사이', 7: '매우 중요', 8: '매우 중요~극히 중요 사이', 9: '극히 중요' };
  const TOKEN_RE = /(?:^|[#?&])t=([A-Za-z0-9_-]{16,64})/;
  const SKEY = 'delphi2:token';
  const KEY = t => 'delphi2:v1:' + t;

  /* ---------- 저장소 (실제 운영: 앱스 스크립트 웹앱 등 서버로 교체) ---------- */
  const Api = {
    async load(token) {
      // 운영 예: fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'load', token }) })
      //   → 서버가 토큰을 확인하고 그 사람의 이름·소속·1차 점수와 저장된 응답만 돌려줌
      const r = S.respondents[token];
      if (!r) return null;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY(token)) || 'null'); } catch (e) { saved = null; }
      return { respondent: r, saved };
    },
    async save(token, data) {
      localStorage.setItem(KEY(token), JSON.stringify(data));
      return true;
    },
    async submit(token, data) {
      const now = new Date();
      data.submittedAt = now.toISOString();
      data.editedAfterSubmit = false;
      if (!data.receipt) data.receipt = 'D2-' + ymd(now) + '-' + (hashStr(token) % 100000).toString().padStart(5, '0');
      await Api.save(token, data);
      return data;
    },
    clear(token) {
      try { localStorage.removeItem(KEY(token)); } catch (e) { /* 무시 */ }
      try { sessionStorage.removeItem(SKEY); } catch (e) { /* 무시 */ }
    }
  };

  /* ---------- 유틸 ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style') Object.assign(el.style, v);
        else if (k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'value') el[k] = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    add(el, kids);
    return el;
  }
  function add(el, kids) {
    for (const c of kids) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) add(el, c);
      else el.append(c instanceof Node ? c : String(c));
    }
  }
  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    arrowL: ['M15 18l-6-6 6-6'],
    arrowR: ['M9 18l6-6-6-6'],
    check: ['M20 6L9 17l-5-5'],
    print: ['M6 9V3h12v6', 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 14h12v7H6z'],
    list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01'],
    doc: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6', 'M8 13h8', 'M8 17h5'],
    lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    mark: ['M3 21h18', 'M5 21V11l4-2v12', 'M9 21V5l6-2v18', 'M15 21V10l4 2v9', 'M12 8h.01', 'M12 12h.01', 'M12 16h.01'],
    T: ['M5 16V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10', 'M5 11h14', 'M5 16h14v2.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V18H8v.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5z', 'M8.5 13.5h.01', 'M15.5 13.5h.01'],
    S: ['M12 21s7.5-3.6 7.5-9.5V5.2L12 2.5 4.5 5.2v6.3C4.5 17.4 12 21 12 21z', 'M9 11.5l2.2 2.2L15.5 9.5'],
    E: ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z', 'M2 21c0-3 1.9-5.4 5.1-6 2.4-.5 4.9-2 5.9-3'],
    W: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'],
    G: ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9.5 21v-7', 'M14.5 21v-7', 'M2 10l10-7 10 7'],
    I: ['M2 18h20', 'M5 18v-5.5', 'M19 18v-5.5', 'M12 18v-7.5', 'M2 12.5c4.5-5.5 15.5-5.5 20 0']
  };
  function icon(name, opts) {
    const o = opts || {};
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', o.color || 'currentColor');
    s.setAttribute('stroke-width', o.sw || '1.9');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    for (const d of ICONS[name]) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); }
    return s;
  }
  function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffled(arr, seed) { const a = arr.slice(); const r = mulberry32(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function ymd(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
  function hm(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function fmtDT(iso) { const d = new Date(iso); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${hm(d)}`; }
  function badge(t) { return h('span', { class: 'badge', 'aria-hidden': 'true' }, t); }

  /* ---------- 상태 ---------- */
  let token = null, R = null, st = null, ORDER = [];
  const app = document.getElementById('app');
  const ui = {};

  function blank() {
    return { v: 1, consent: false, step: 'intro', p1: {}, p1note: '', p2: {}, p3: {}, p3note: {}, p3view: 'list', p3cur: 0, p3filter: 'all', crAck: false, submittedAt: null, receipt: null, editedAfterSubmit: false, updatedAt: null };
  }

  const p1Count = () => CID.filter(id => st.p1[id] && st.p1[id].score).length;
  const pairDone = k => { const a = st.p2[k]; return !!a && (a.side === 'E' || (!!a.side && !!a.v)); };
  const p2Count = () => PAIRS.filter(([i, j]) => pairDone(pkey(i, j))).length;
  const svcCount = sid => CID.filter(id => st.p3[sid] && st.p3[sid][id]).length;
  const p3Done = () => ORDER.filter(s => svcCount(s.id) === N).length;
  const p3Ratings = () => ORDER.reduce((n, s) => n + svcCount(s.id), 0);
  const TOTAL = () => N + PAIRS.length + ORDER.length * N;
  const overall = () => (p1Count() + p2Count() + p3Ratings()) / TOTAL();
  const allDone = () => p1Count() === N && p2Count() === PAIRS.length && p3Done() === ORDER.length;

  function ahp() {
    if (p2Count() < PAIRS.length) return null;
    const A = [];
    for (let i = 0; i < N; i++) { A.push([]); for (let j = 0; j < N; j++) A[i].push(i === j ? 1 : 0); }
    for (const [i, j] of PAIRS) {
      const a = st.p2[pkey(i, j)];
      const x = a.side === 'L' ? a.v : a.side === 'R' ? 1 / a.v : 1;
      A[i][j] = x; A[j][i] = 1 / x;
    }
    let w = new Array(N).fill(1 / N);
    for (let it = 0; it < 500; it++) {
      const nw = A.map(row => row.reduce((s, v, k) => s + v * w[k], 0));
      const sum = nw.reduce((a, b) => a + b, 0);
      const nn = nw.map(v => v / sum);
      const diff = nn.reduce((s, v, k) => s + Math.abs(v - w[k]), 0);
      w = nn;
      if (diff < 1e-13) break;
    }
    const Aw = A.map(row => row.reduce((s, v, k) => s + v * w[k], 0));
    const lambda = Aw.reduce((s, v, i) => s + v / w[i], 0) / N;
    const CI = (lambda - N) / (N - 1);
    const CR = Math.max(0, CI / RI[N]);
    const dev = PAIRS.map(([i, j], idx) => { const a = A[i][j]; const implied = w[i] / w[j]; return { i, j, idx, a, implied, d: Math.abs(Math.log(a / implied)) }; }).sort((x, y) => y.d - x.d);
    return { w, lambda, CI, CR, dev };
  }
  function ratioText(i, j, x, approx) {
    if (x > 1.05) return `${CID[i]} 쪽 ${approx ? '약 ' + x.toFixed(1) : Math.round(x)}`;
    if (x < 1 / 1.05) return `${CID[j]} 쪽 ${approx ? '약 ' + (1 / x).toFixed(1) : Math.round(1 / x)}`;
    return '같음';
  }

  /* ---------- 저장 ---------- */
  let saveTimer = null;
  function persist() {
    st.updatedAt = new Date().toISOString();
    if (st.submittedAt && st.step !== 'done') st.editedAfterSubmit = true;
    setSave('busy');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await Api.save(token, st); setSave('ok'); } catch (e) { setSave('err'); }
    }, 300);
    refreshChrome();
  }
  function persistQuiet() { // 화면 이동 정보만 저장 (수정 표시 없이)
    clearTimeout(saveTimer);
    try { Api.save(token, st); } catch (e) { /* 무시 */ }
  }
  function setSave(state) {
    if (!ui.save) return;
    ui.save.className = 'save-state ' + (state === 'ok' ? 'ok' : state === 'busy' ? 'busy' : '');
    ui.save.textContent = state === 'busy' ? '저장 중…' : state === 'err' ? '저장 실패 · 연결을 확인해 주십시오' : '자동 저장됨 ' + hm(new Date());
  }

  /* ---------- 공통 화면 요소 ---------- */
  function demoBar() {
    return h('div', { class: 'demo-bar no-print' }, h('div', { class: 'wrap' },
      h('span', { class: 'tag' }, '샘플'),
      h('span', null, h('strong', null, '가상 응답자와 예시 서비스로 만든 시연 화면입니다.'), h('span', { class: 'long' }, ' 입력값은 이 기기 브라우저에만 저장되며 어디에도 전송되지 않습니다.')),
      h('span', { class: 'sp' }),
      h('button', { type: 'button', onclick: () => { try { sessionStorage.removeItem(SKEY); } catch (e) { /* 무시 */ } token = null; renderGate(); } }, '다른 응답자'),
      token ? h('button', { type: 'button', onclick: () => { if (confirm('이 샘플 응답자의 입력값을 모두 지우고 처음부터 시작할까요?')) { localStorage.removeItem(KEY(token)); st = blank(); render(); } } }, '처음부터') : null
    ));
  }

  const STEPS = [
    { id: 'p1', n: 1, pre: '평가항목 ', name: '적절성', cnt: () => `${p1Count()}/${N}`, frac: () => p1Count() / N },
    { id: 'p2', n: 2, pre: '평가항목 ', name: '중요도', cnt: () => `${p2Count()}/${PAIRS.length}`, frac: () => p2Count() / PAIRS.length },
    { id: 'p3', n: 3, pre: '후보 ', name: '서비스', cnt: () => `${p3Done()}/${ORDER.length}`, frac: () => p3Ratings() / (ORDER.length * N) },
    { id: 'review', n: 4, pre: '확인·', name: '제출', cnt: () => (st.submittedAt && !st.editedAfterSubmit ? '제출 완료' : allDone() ? '제출 가능' : '미제출'), frac: () => (st.submittedAt && !st.editedAfterSubmit ? 1 : 0) }
  ];

  function header() {
    ui.save = h('span', { class: 'save-state', role: 'status', 'aria-live': 'polite' }, st && st.updatedAt ? '자동 저장됨 ' + hm(new Date(st.updatedAt)) : '자동 저장');
    if (st && st.updatedAt) ui.save.classList.add('ok');
    const showSteps = st && ['p1', 'p2', 'p3', 'review', 'done'].includes(st.step);
    ui.steps = {};
    let stepper = null;
    if (showSteps) {
      stepper = h('nav', { class: 'stepper', 'aria-label': '조사 단계' }, STEPS.map(s => {
        const small = h('small', null, s.cnt());
        const bar = h('i');
        const cur = st.step === s.id || (s.id === 'review' && st.step === 'done');
        const btn = h('button', { class: 'step', type: 'button', 'aria-current': cur ? 'step' : null, onclick: () => go(s.id) },
          h('span', { class: 'n' }, String(s.n)),
          h('span', { class: 'l' }, h('b', null, h('span', { class: 'long' }, s.pre), s.name), small),
          h('span', { class: 'bar', 'aria-hidden': 'true' }, bar));
        ui.steps[s.id] = { small, bar, btn, s };
        return btn;
      }));
    }
    return h('header', { class: 'hdr' }, h('div', { class: 'wrap' },
      h('div', { class: 'hdr-top' },
        h('div', { class: 'brand' },
          h('span', { class: 'mark' }, icon('mark', { color: '#fff', sw: '2.2' })),
          h('span', { class: 't1' }, META.project),
          h('span', { class: 't2' }, META.title),
          h('span', { class: 'round' }, META.round)),
        st ? h('div', { class: 'hdr-right' }, ui.save, h('span', { class: 'who' }, `${R.name} 위원님`)) : null),
      stepper));
  }

  function refreshChrome() {
    if (!ui.steps) return;
    for (const id in ui.steps) {
      const u = ui.steps[id];
      u.small.textContent = u.s.cnt();
      u.bar.style.width = Math.round(u.s.frac() * 100) + '%';
      u.btn.classList.toggle('done', u.s.frac() >= 1);
    }
    if (ui.mid) ui.mid();
  }

  function footer() {
    return h('footer', { class: 'foot no-print' }, h('div', { class: 'wrap' },
      h('span', null, `${META.project} ${META.title} 연구진`),
      h('span', null, `문의 ${META.contact} (예시)`),
      h('span', null, '개인 링크는 위원님 전용입니다. 다른 분께 전달하지 마십시오.')));
  }

  function navbar(prev, next, mid) {
    const midEl = h('div', { class: 'mid', 'aria-live': 'polite' });
    ui.mid = mid ? () => { midEl.replaceChildren(...[].concat(mid())); } : null;
    const nb = h('nav', { class: 'navbar no-print', 'aria-label': '이전·다음' }, h('div', { class: 'wrap' },
      prev ? h('button', { class: 'btn', type: 'button', onclick: prev.on, disabled: prev.disabled || null }, icon('arrowL'), h('span', { class: 'lbl-l' }, prev.label), h('span', { class: 'lbl-s' }, prev.short || '이전')) : h('span'),
      midEl,
      next ? h('button', { class: 'btn primary', type: 'button', onclick: next.on, id: 'navNext', disabled: next.disabled || null }, h('span', { class: 'lbl-l' }, next.label), h('span', { class: 'lbl-s' }, next.short || '다음'), icon('arrowR')) : null));
    return nb;
  }

  function pageHead(eyebrow, title, desc) {
    return h('div', { class: 'page-head' },
      h('p', { class: 'eyebrow' }, eyebrow),
      h('h2', { id: 'pageTitle', tabindex: '-1' }, title),
      desc ? h('p', { class: 'desc' }, desc) : null);
  }

  /* ---------- 화면 이동 ---------- */
  function go(step, after) {
    if (!st.consent && step !== 'intro') { step = 'intro'; }
    st.step = step;
    persistQuiet();
    render();
    window.scrollTo(0, 0);
    const t = document.getElementById('pageTitle');
    if (t) t.focus({ preventScroll: true });
    if (after) requestAnimationFrame(after);
  }
  function nextUnfinished() {
    if (p1Count() < N) return 'p1';
    if (p2Count() < PAIRS.length) return 'p2';
    if (p3Done() < ORDER.length) return 'p3';
    return 'review';
  }

  function render() {
    ui.mid = null;
    const view = (VIEWS[st.step] || VIEWS.intro)();
    const main = h('main', { id: 'main', tabindex: '-1' }, h('div', { class: 'wrap' }, view.body));
    const nodes = [];
    if (META.demo) nodes.push(demoBar());
    nodes.push(header(), main, footer());
    if (view.nav) nodes.push(view.nav);
    app.replaceChildren(...nodes);
    refreshChrome();
    if (view.after) view.after();
  }

  /* ---------- 시작 화면 ---------- */
  function viewIntro() {
    const started = overall() > 0;
    const pct = Math.round(overall() * 100);
    const startBtn = h('button', { class: 'btn primary', type: 'button', disabled: !st.consent, onclick: () => go(st.submittedAt ? 'done' : nextUnfinished()) },
      st.submittedAt ? '제출 내역 보기' : started ? `이어서 응답하기 (${pct}% 진행)` : '조사 시작하기', icon('arrowR'));
    const cb = h('input', { type: 'checkbox', id: 'consent', checked: !!st.consent });
    cb.addEventListener('change', () => { st.consent = cb.checked; startBtn.disabled = !cb.checked; persist(); });
    const fact = (k, v) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
    const part = (n, t, d, chips) => h('article', { class: 'card part' }, h('p', { class: 'pn' }, n), h('h3', null, t), h('p', null, d), h('div', { class: 'meta' }, chips.map(c => h('span', { class: 'chip' }, c))));
    return {
      body: [
        h('section', { class: 'card', 'aria-labelledby': 'pageTitle' },
          h('div', { class: 'hero' },
            h('div', null,
              h('p', { class: 'eyebrow' }, `${META.project} · ${META.title}`),
              h('h1', { id: 'pageTitle', tabindex: '-1' }, `${META.round} 조사에 `, h('em', null, '참여해 주셔서'), ' 감사합니다'),
              h('p', { class: 'lead' }, '1차 결과를 확인하신 뒤 평가항목의 적절성을 다시 검토하고, 평가항목 간 중요도와 후보 서비스 40종을 평가해 주십시오.')),
            h('div', { class: 'whoami' },
              h('div', { class: 'k' }, '응답자 확인'),
              h('div', { class: 'nm' }, `${R.name} 위원님`),
              h('div', { class: 'org' }, R.org),
              h('p', { class: 'not-me' }, `본인이 아니시면 응답하지 마시고 연구진(${META.contact})에 알려 주십시오.`))),
          h('div', { class: 'facts' },
            fact('조사 기간', META.period),
            fact('예상 소요 시간', `약 ${META.estMinutes}분 · 나눠서 응답 가능`),
            fact('저장 방식', '자동 저장 · 같은 링크로 이어서 응답'))),
        h('div', { class: 'parts' },
          part('1부', '평가항목 적절성 재검토', '1차 점수와 전체 전문가 응답을 비교하고 2차 점수를 정합니다.', ['6문항', '약 3분']),
          part('2부', '평가항목 중요도', '두 항목씩 비교해 어느 쪽이 더 중요한지 답합니다. 응답 일관성이 바로 계산됩니다.', ['쌍대비교 15개', '약 7분']),
          part('3부', '후보 서비스 평가', '서비스 카드를 읽고 6개 평가항목별로 점수를 매깁니다.', ['40종 × 6항목', '약 30분'])),
        h('section', { class: 'card privacy', 'aria-labelledby': 'pvt' },
          h('h3', { id: 'pvt' }, '개인정보 처리 안내 ', h('span', { class: 'chip' }, '문안 예시')),
          h('dl', null,
            h('dt', null, '수집 항목'), h('dd', null, '2차 응답 내용과 응답 시각. 성명·소속·연락처는 1차에서 받은 정보를 쓰며 새로 받지 않습니다.'),
            h('dt', null, '이용 목적'), h('dd', null, `${META.project} 전문가 조사(델파이) 결과 분석`),
            h('dt', null, '공개 범위'), h('dd', null, '결과는 통계로만 공개하며 개인별 응답은 공개하지 않습니다.'),
            h('dt', null, '보유 기간'), h('dd', null, '연구 종료 후 파기 (기간은 연구진 확정)')),
          h('label', { class: 'check', for: 'consent' }, cb, h('span', null, '위 내용을 확인했으며 조사에 참여합니다'))),
        h('div', { class: 'start-actions' }, startBtn,
          h('p', { class: 'note' }, '이 링크는 위원님 전용입니다. 다른 분께 전달하지 마십시오.'))
      ],
      nav: null
    };
  }

  /* ---------- 1부: 적절성 재검토 ---------- */
  function viewP1() {
    const items = C.map(c => p1Item(c));
    const note = h('textarea', { id: 'p1note', placeholder: '수정·통합·추가·삭제가 필요한 항목과 이유를 적어 주십시오.', maxlength: '2000' });
    note.value = st.p1note || '';
    note.addEventListener('input', () => { st.p1note = note.value; persist(); });
    return {
      body: [
        pageHead('1부 · 평가항목 적절성 재검토', '1차 결과를 보고 2차 점수를 정해 주십시오',
          `위원님의 1차 점수와 전체 전문가 ${META.n1}명의 응답 분포를 비교한 뒤 2차 점수를 선택해 주십시오. 1차와 같은 점수를 고르면 ‘유지’, 다른 점수를 고르면 ‘조정’으로 기록됩니다. 집단 결과에 맞출 의무는 없으며 위원님의 판단을 존중합니다.`),
        h('div', { class: 'legend', 'aria-hidden': 'true' },
          h('span', { class: 'me' }, h('i'), '나의 1차 점수'),
          h('span', { class: 'avg' }, h('i'), '전체 평균'),
          h('span', null, `점수: 1점(전혀 적절하지 않음) ~ 5점(매우 적절함) · 전체 N=${META.n1}`)),
        h('div', { class: 'items', style: { marginTop: '18px' } }, items),
        h('section', { class: 'card p1-note' },
          h('label', { class: 'field-label', for: 'p1note' }, '평가항목 보완 의견', h('small', null, '선택')), note)
      ],
      nav: navbar({ label: '시작 화면', short: '처음', on: () => go('intro') }, { label: '다음: 중요도 평가', short: '다음', on: () => go('p2') },
        () => [h('b', null, `${p1Count()}/${N}`), ' 응답']),
    };
  }

  function p1Item(c) {
    const my = R.r1[c.id];
    const s = c.stats;
    const cur = st.p1[c.id] || {};
    const max = Math.max(...s.dist);
    const cols = s.dist.map((n, k) => h('div', { class: 'dist-col' + (k + 1 === my ? ' me' : '') },
      h('span', { class: 'c' }, `${n}명`),
      h('span', { class: 'b', style: { height: `calc(${(n / max) * 100}% - 20px)` } })));
    const m1 = (s.mean - 1).toFixed(3);
    const avg = h('div', { class: 'dist-avg', style: { left: `calc(${m1} * (100% + 10px) / 5 + (100% - 40px) / 10 - 1px)` } }, h('span', null, `평균 ${s.mean.toFixed(2)}`));
    const overlay = h('div', { style: { position: 'absolute', left: '4px', right: '4px', top: '0', bottom: '0', pointerEvents: 'none' } }, avg);

    const status = h('div', { class: 'status-line', 'aria-live': 'polite' });
    const reasonTa = h('textarea', { id: `rs-${c.id}`, placeholder: '예: 다른 항목과 겹치는 부분이 있어 낮춤', maxlength: '1000' });
    reasonTa.value = cur.reason || '';
    reasonTa.addEventListener('input', () => { st.p1[c.id] = Object.assign({}, st.p1[c.id], { reason: reasonTa.value }); persist(); });
    const reason = h('div', { class: 'reason', hidden: true }, h('label', { class: 'field-label', for: `rs-${c.id}` }, '조정 이유', h('small', null, '선택')), reasonTa);
    const upd = () => {
      const sc = st.p1[c.id] && st.p1[c.id].score;
      if (!sc) status.replaceChildren(h('span', { class: 'chip' }, '미응답'), '2차 점수를 선택해 주십시오.');
      else if (sc === my) status.replaceChildren(h('span', { class: 'chip teal' }, '유지'), `${sc}점 · ${P1_LABELS[sc - 1]}`);
      else status.replaceChildren(h('span', { class: 'chip orange' }, '조정'), `1차 ${my}점 → 2차 ${sc}점 · ${P1_LABELS[sc - 1]}`);
      reason.hidden = !(sc && sc !== my);
    };
    const qid = `q-${c.id}`;
    const opts = [1, 2, 3, 4, 5].map(v => h('label', { class: 'opt' },
      h('input', { type: 'radio', name: `p1-${c.id}`, value: String(v), checked: cur.score === v, onchange: () => { st.p1[c.id] = Object.assign({}, st.p1[c.id], { score: v }); persist(); upd(); } }),
      h('span', { class: 'face' }, h('b', null, String(v)), h('small', null, P1_LABELS[v - 1]), v === my ? h('span', { class: 'sr' }, ' (1차 응답 점수)') : null),
      v === my ? h('span', { class: 'prev', 'aria-hidden': 'true' }, '1차') : null));
    upd();
    return h('article', { class: 'card item', id: `p1-${c.id}`, 'aria-labelledby': `h-${c.id}` },
      h('div', null,
        h('div', { class: 'item-h' }, badge(c.id), h('div', null, h('h3', { id: `h-${c.id}` }, c.name), h('p', { class: 'def' }, c.def))),
        h('div', { class: 'stats' },
          h('div', { class: 'stat me' }, h('div', { class: 'k' }, '나의 1차'), h('div', { class: 'v' }, `${my}점`)),
          h('div', { class: 'stat avg' }, h('div', { class: 'k' }, '전체 평균'), h('div', { class: 'v' }, s.mean.toFixed(2))),
          h('div', { class: 'stat' }, h('div', { class: 'k' }, '중앙값'), h('div', { class: 'v' }, `${s.median}점`)),
          h('div', { class: 'stat' }, h('div', { class: 'k' }, '4·5점 비율'), h('div', { class: 'v' }, `${s.pos.toFixed(1)}%`))),
        h('div', { class: 'dist', role: 'img', 'aria-label': `응답 분포: ${s.dist.map((n, k) => `${k + 1}점 ${n}명`).join(', ')}. 전체 평균 ${s.mean.toFixed(2)}, 나의 1차 ${my}점` },
          h('div', { class: 'dist-cap' }, h('span', null, '전체 응답 분포'), h('span', null, `N=${META.n1}`)),
          h('div', { class: 'dist-plot' }, cols, overlay),
          h('div', { class: 'dist-x' }, [1, 2, 3, 4, 5].map(v => h('span', { class: v === my ? 'me' : null }, v === my ? `${v}점 · 나` : `${v}점`))))),
      h('div', { class: 'answer' },
        h('p', { class: 'answer-q', id: qid }, '2차 점수를 선택해 주십시오'),
        h('fieldset', { class: 'scale', 'aria-labelledby': `${qid} h-${c.id}` }, h('div', { class: 'opts' }, opts)),
        h('div', { class: 'scale-ends', 'aria-hidden': 'true' }, h('span', null, '1 전혀 적절하지 않음'), h('span', null, '5 매우 적절함')),
        status, reason));
  }

  /* ---------- 2부: AHP 쌍대비교 ---------- */
  function viewP2() {
    const panel = h('aside', { class: 'card ahp', 'aria-label': '현재 응답 기준 중요도와 일관성' });
    const fill = () => fillAhp(panel);
    const cards = PAIRS.map(([i, j], idx) => pairCard(i, j, idx, fill));
    fill();
    return {
      body: [
        pageHead('2부 · 평가항목 중요도 (쌍대비교)', '두 항목 중 더 중요한 쪽을 골라 주십시오',
          '우수 서비스를 선정할 때 두 평가항목 중 어느 쪽이 더 중요한지 고르고, 얼마나 더 중요한지 선택해 주십시오. 15개 비교를 모두 마치면 응답의 일관성 비율(CR)이 바로 계산되며, 0.1 이하이면 일관된 응답으로 봅니다.'),
        h('div', { class: 'guide', 'aria-label': '척도 안내' },
          h('span', { class: 'g' }, h('b', null, '1'), '같음'),
          h('span', { class: 'g' }, h('b', null, '3'), '약간 중요'),
          h('span', { class: 'g' }, h('b', null, '5'), '중요'),
          h('span', { class: 'g' }, h('b', null, '7'), '매우 중요'),
          h('span', { class: 'g' }, h('b', null, '9'), '극히 중요'),
          h('span', null, '2·4·6·8은 중간값')),
        h('div', { class: 'p2', style: { marginTop: '18px' } }, h('ol', { class: 'pairs' }, cards), panel)
      ],
      nav: navbar({ label: '이전: 적절성', on: () => go('p1') }, { label: '다음: 서비스 평가', on: () => go('p3') },
        () => { const r = ahp(); return [h('b', null, `${p2Count()}/${PAIRS.length}`), ' 비교', r ? ` · 일관성 ${r.CR.toFixed(3)} ${r.CR <= 0.1 ? '양호' : '재검토 권장'}` : '']; })
    };
  }

  function pairCard(i, j, idx, onChange) {
    const k = pkey(i, j);
    const a = st.p2[k] || {};
    const ci = C[i], cj = C[j];
    const stChip = h('span', { class: 'chip' });
    const sum = h('p', { class: 'pair-sum', 'aria-live': 'polite' });
    const ints = [2, 3, 4, 5, 6, 7, 8, 9].map(v => h('label', { class: 'int' },
      h('input', { type: 'radio', name: `p2v-${k}`, value: String(v), checked: a.v === v, onchange: () => { st.p2[k] = Object.assign({}, st.p2[k], { v }); persist(); upd(); onChange(); } }),
      h('span', { class: 'face' }, h('b', null, String(v)), h('small', null, INT_SHORT[v] || '\u00A0'))));
    const intens = h('fieldset', { class: 'intens', hidden: !(a.side === 'L' || a.side === 'R') },
      h('legend', { id: `il-${k}` }, '얼마나 더 중요합니까?'), h('div', { class: 'row' }, ints));
    const side = (val, cls, content, label) => h('label', { class: 'side ' + cls },
      h('input', { type: 'radio', name: `p2-${k}`, value: val, checked: a.side === val, 'aria-label': label, onchange: () => { st.p2[k] = Object.assign({}, st.p2[k], { side: val }); persist(); upd(); onChange(); } }),
      h('span', { class: 'face' }, content));
    const upd = () => {
      const x = st.p2[k] || {};
      intens.hidden = !(x.side === 'L' || x.side === 'R');
      const done = pairDone(k);
      stChip.className = 'chip' + (done ? ' ok' : '');
      stChip.textContent = done ? '응답 완료' : '미응답';
      if (!x.side) sum.replaceChildren('더 중요한 항목을 고르거나 ‘같음’을 선택해 주십시오.');
      else if (x.side === 'E') sum.replaceChildren(h('b', null, `${ci.id}와 ${cj.id}`), '는 같은 정도로 중요 (1)');
      else {
        const [p, q] = x.side === 'L' ? [ci, cj] : [cj, ci];
        if (!x.v) sum.replaceChildren(h('b', null, `${p.id}`), `가 더 중요 · 얼마나 더 중요한지 선택해 주십시오.`);
        else sum.replaceChildren(h('b', null, p.id), `가 ${q.id}보다 `, h('b', null, `‘${INT_NAME[x.v]}’`), ` (${x.v})`);
      }
    };
    upd();
    return h('li', { class: 'card pair', id: `pair-${k}` },
      h('div', { class: 'pair-top' }, h('b', null, `비교 ${idx + 1} / ${PAIRS.length}`), stChip),
      h('fieldset', { class: 'sides' },
        h('legend', { class: 'sr' }, `비교 ${idx + 1}: ${ci.name}와 ${cj.name} 중 더 중요한 항목`),
        side('L', 'l', [badge(ci.id), h('span', null, ci.name)], `${ci.name} 쪽이 더 중요`),
        side('E', 'eq', '같음', '두 항목이 같은 정도로 중요'),
        side('R', 'r', [badge(cj.id), h('span', null, cj.name)], `${cj.name} 쪽이 더 중요`)),
      intens, sum);
  }

  function fillAhp(panel) {
    const done = p2Count();
    const r = ahp();
    const kids = [
      h('h3', null, '현재 응답 기준 중요도'),
      h('p', { class: 'sub' }, `비교 ${done} / ${PAIRS.length} 완료`),
      h('div', { class: 'prog', 'aria-hidden': 'true' }, h('i', { style: { width: `${(done / PAIRS.length) * 100}%` } }))
    ];
    if (!r) {
      kids.push(h('p', { class: 'note', style: { marginTop: '12px' } }, '15개 비교를 모두 마치면 항목별 중요도(가중치)와 응답 일관성을 바로 계산해 보여 드립니다.'));
    } else {
      const order = CID.map((id, i) => ({ i, w: r.w[i] })).sort((a, b) => b.w - a.w);
      const mx = order[0].w;
      kids.push(h('div', { class: 'wlist' }, order.map(o => h('div', { class: 'w' },
        badge(CID[o.i]), h('span', { class: 'nm' }, C[o.i].name),
        h('span', { class: 'bar' }, h('i', { style: { width: `${(o.w / mx) * 100}%` } })),
        h('span', { class: 'pct' }, `${(o.w * 100).toFixed(1)}%`)))));
      const ok = r.CR <= 0.1;
      kids.push(h('div', { class: 'cr ' + (ok ? 'ok' : 'bad') },
        h('div', { class: 'k' }, '일관성 비율 (CR)'),
        h('div', { class: 'v' }, r.CR.toFixed(3)),
        h('p', null, ok ? '기준(0.1 이하)을 충족합니다.' : '기준 0.1을 넘습니다. 아래 비교를 다시 살펴봐 주십시오. 판단을 바꿀 의무는 없습니다.')));
      if (!ok) {
        kids.push(h('div', { class: 'recheck' }, r.dev.slice(0, 3).map(d => h('button', { type: 'button', onclick: () => jumpPair(pkey(d.i, d.j)) },
          h('b', null, `비교 ${d.idx + 1} · ${CID[d.i]} ↔ ${CID[d.j]}`),
          h('span', null, `응답: ${ratioText(d.i, d.j, d.a)} / 다른 응답들로 본 예상: ${ratioText(d.i, d.j, d.implied, true)}`)))));
      }
    }
    panel.replaceChildren(...kids);
    if (ui.mid) ui.mid();
  }

  function jumpPair(k) {
    const el = document.getElementById(`pair-${k}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1600);
    const inp = el.querySelector('input:checked') || el.querySelector('input');
    if (inp) inp.focus({ preventScroll: true });
  }

  /* ---------- 3부: 서비스 평가 ---------- */
  function viewP3() { return st.p3view === 'detail' ? viewP3Detail() : viewP3List(); }

  function svcChip(sid) {
    const n = svcCount(sid);
    if (n === N) return h('span', { class: 'chip ok' }, icon('check', { sw: '2.6' }), '평가 완료');
    if (n > 0) return h('span', { class: 'chip warn' }, `${n}/${N} 진행`);
    return h('span', { class: 'chip' }, '미평가');
  }
  function openSvc(idx) { st.p3view = 'detail'; st.p3cur = Math.max(0, Math.min(ORDER.length - 1, idx)); go('p3'); }
  function firstIncomplete() { const i = ORDER.findIndex(s => svcCount(s.id) < N); return i < 0 ? 0 : i; }

  function viewP3List() {
    const done = p3Done();
    const left = ORDER.length - done;
    const grid = h('ul', { class: 'svc-grid' });
    const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': '목록 보기' });
    const drawTabs = () => {
      const d = p3Done();
      tabs.replaceChildren(...[['all', `전체 ${ORDER.length}`], ['left', `남음 ${ORDER.length - d}`], ['done', `완료 ${d}`]].map(([id, label]) =>
        h('button', { type: 'button', 'aria-pressed': st.p3filter === id ? 'true' : 'false', onclick: () => { st.p3filter = id; persistQuiet(); drawTabs(); drawGrid(); } }, label)));
    };
    const drawGrid = () => {
      const list = ORDER.map((s, idx) => ({ s, idx })).filter(({ s }) => st.p3filter === 'all' ? true : st.p3filter === 'done' ? svcCount(s.id) === N : svcCount(s.id) < N);
      grid.replaceChildren(...list.map(({ s, idx }) => {
        const cat = S.categories[s.cat];
        const dot = h('i', { style: { background: cat.color } });
        return h('li', null, h('button', { class: 'tile' + (svcCount(s.id) === N ? ' done' : ''), type: 'button', onclick: () => openSvc(idx), 'aria-label': `${idx + 1}번 ${s.name}, ${svcCount(s.id) === N ? '평가 완료' : `${svcCount(s.id)}/${N} 진행`}` },
          h('span', { class: 'top' }, h('span', { class: 'no' }, String(idx + 1).padStart(2, '0')), svcChip(s.id)),
          h('span', { class: 'cat', style: { color: cat.color } }, dot, cat.name),
          h('h3', null, s.name),
          h('p', null, s.summary)));
      }));
      if (!list.length) grid.replaceChildren(h('li', { class: 'note' }, '해당하는 서비스가 없습니다.'));
    };
    drawTabs(); drawGrid();
    return {
      body: [
        pageHead('3부 · 후보 서비스 평가', `후보 서비스 ${ORDER.length}종을 평가해 주십시오`,
          '서비스 카드를 읽고 6개 평가항목별로 1~5점을 선택해 주십시오. 서비스 순서는 순서 효과를 줄이기 위해 위원님마다 다르게 배치됩니다. 중간에 멈추셔도 자동 저장되며 같은 링크로 이어서 응답하실 수 있습니다.'),
        h('section', { class: 'card p3-sum' },
          h('div', { class: 'big' }, String(done), h('small', null, ` / ${ORDER.length} 완료`)),
          h('div', { class: 'prog', 'aria-hidden': 'true' }, h('i', { style: { width: `${(p3Ratings() / (ORDER.length * N)) * 100}%` } })),
          left ? h('button', { class: 'btn primary small', type: 'button', onclick: () => openSvc(firstIncomplete()) }, done ? '남은 서비스 이어서 평가' : '첫 서비스부터 평가', icon('arrowR')) : h('span', { class: 'chip ok' }, '모든 서비스 평가 완료')),
        tabs, grid
      ],
      nav: navbar({ label: '이전: 중요도', on: () => go('p2') }, { label: left ? '확인·제출 화면' : '다음: 확인·제출', short: '확인', on: () => go('review') },
        () => [h('b', null, `${p3Done()}/${ORDER.length}`), ' 서비스 완료'])
    };
  }

  function viewP3Detail() {
    const idx = st.p3cur;
    const s = ORDER[idx];
    const cat = S.categories[s.cat];
    const chipBox = h('span', null, svcChip(s.id));
    const doneMsg = h('div', { class: 'done-chip', 'aria-live': 'polite' });
    const updDone = () => {
      chipBox.replaceChildren(svcChip(s.id));
      const n = svcCount(s.id);
      doneMsg.replaceChildren(n === N ? h('span', { class: 'chip ok' }, icon('check', { sw: '2.6' }), idx < ORDER.length - 1 ? '이 서비스 평가 완료 · 다음 서비스로 넘어가 주십시오' : '마지막 서비스까지 평가했습니다') : h('span', { class: 'note' }, `${n}/${N}개 항목 선택`));
    };
    const rows = C.map(c => {
      const cur = st.p3[s.id] && st.p3[s.id][c.id];
      return h('fieldset', { class: 'rrow' },
        h('legend', { class: 'sr' }, `${c.id} ${c.name}`),
        h('div', { class: 'rrow-in' },
          h('span', { class: 'rlabel', 'aria-hidden': 'true' }, badge(c.id), h('span', null, c.name)),
          h('div', { class: 'opts' }, [1, 2, 3, 4, 5].map(v => h('label', { class: 'opt' },
            h('input', { type: 'radio', name: `p3-${s.id}-${c.id}`, value: String(v), checked: cur === v, onchange: () => { st.p3[s.id] = Object.assign({}, st.p3[s.id], { [c.id]: v }); persist(); updDone(); } }),
            h('span', { class: 'face' }, h('b', null, String(v)), h('small', { class: 'sr' }, ['', '매우 낮음', '낮음', '보통', '높음', '매우 높음'][v])))))));
    });
    const ta = h('textarea', { id: `sn-${s.id}`, placeholder: '평가 근거나 보완 의견이 있으면 적어 주십시오.', maxlength: '1000' });
    ta.value = st.p3note[s.id] || '';
    ta.addEventListener('input', () => { st.p3note[s.id] = ta.value; persist(); });
    updDone();
    const band = h('div', { class: 'svc-band', style: { background: cat.color } },
      h('span', { class: 'ic' }, icon(s.cat, { color: '#fff' })),
      h('div', null,
        h('div', { class: 'meta' }, h('span', null, cat.name), h('span', null, `추진 단계 ${s.stage}`)),
        h('h2', { id: 'pageTitle', tabindex: '-1' }, s.name)));
    return {
      body: [
        h('div', { class: 'svc-top' },
          h('button', { class: 'btn small', type: 'button', onclick: () => { st.p3view = 'list'; go('p3'); } }, icon('list'), '전체 목록'),
          h('span', { class: 'pos' }, '서비스 ', h('b', null, String(idx + 1)), ` / ${ORDER.length}`),
          chipBox),
        h('div', { class: 'svc' },
          h('article', { class: 'card svc-card', 'aria-labelledby': 'pageTitle' }, band,
            h('div', { class: 'svc-body' },
              h('p', { class: 'sum' }, s.summary),
              h('dl', null,
                h('div', null, h('dt', null, '주요 기능'), h('dd', null, h('ul', null, s.features.map(f => h('li', null, f))))),
                h('div', null, h('dt', null, '활용 데이터'), h('dd', null, h('div', { class: 'tags' }, s.data.map(d => h('span', null, d))))),
                h('div', null, h('dt', null, '기대 효과'), h('dd', null, s.effect))),
              h('p', { class: 'sample-note' }, '예시 카드입니다. 실제 조사에서는 연구진이 작성한 서비스 카드(원본 이미지 확대 보기 포함)가 이 자리에 들어갑니다.'))),
          h('section', { class: 'card rate', 'aria-labelledby': 'rate-h' },
            h('h3', { id: 'rate-h' }, '평가항목별 점수'),
            h('p', { class: 'sub' }, '이 서비스가 각 평가항목을 얼마나 충족하는지 선택해 주십시오.'),
            h('div', { class: 'rate-ends', 'aria-hidden': 'true' }, h('span'), h('div', null, h('span', null, '1 매우 낮음'), h('span', null, '3 보통'), h('span', null, '5 매우 높음'))),
            h('div', { class: 'rrows' }, rows),
            doneMsg,
            h('div', { style: { marginTop: '16px' } }, h('label', { class: 'field-label', for: `sn-${s.id}` }, '이 서비스에 대한 의견', h('small', null, '선택')), ta)))
      ],
      nav: navbar(
        idx > 0 ? { label: '이전 서비스', on: () => openSvc(idx - 1) } : { label: '목록으로', short: '목록', on: () => { st.p3view = 'list'; go('p3'); } },
        idx < ORDER.length - 1 ? { label: '다음 서비스', on: () => openSvc(idx + 1) } : { label: '확인·제출로', short: '확인', on: () => { st.p3view = 'list'; go('review'); } },
        () => [h('b', null, `${svcCount(s.id)}/${N}`), ` 항목 · 전체 ${p3Done()}/${ORDER.length} 서비스 완료`])
    };
  }

  /* ---------- 확인·제출 ---------- */
  function viewReview() {
    const r = ahp();
    const c1 = p1Count(), c2 = p2Count(), c3 = p3Done();
    const kept = CID.filter(id => st.p1[id] && st.p1[id].score === R.r1[id]).length;
    const changed = CID.filter(id => st.p1[id] && st.p1[id].score && st.p1[id].score !== R.r1[id]);
    const miss1 = C.filter(c => !(st.p1[c.id] && st.p1[c.id].score));
    const miss2 = PAIRS.map(([i, j], idx) => ({ i, j, idx })).filter(p => !pairDone(pkey(p.i, p.j)));
    const miss3 = ORDER.map((s, idx) => ({ s, idx })).filter(o => svcCount(o.s.id) < N);
    const remaining = (N - c1) + (PAIRS.length - c2) + (ORDER.length * N - p3Ratings());
    const crBad = r && r.CR > 0.1;
    const ack = h('input', { type: 'checkbox', id: 'crack', checked: !!st.crAck });
    const complete = allDone();
    const submitBtn = h('button', { class: 'btn primary', type: 'button', disabled: !(complete && (!crBad || st.crAck)) }, st.submittedAt ? '수정 내용 다시 제출하기' : '제출하기', icon('arrowR'));
    ack.addEventListener('change', () => { st.crAck = ack.checked; persist(); submitBtn.disabled = !(complete && (!crBad || st.crAck)); });
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true; submitBtn.textContent = '제출 중…';
      try { await Api.submit(token, st); go('done'); } catch (e) { submitBtn.disabled = false; submitBtn.textContent = '다시 시도'; alert('제출하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주십시오. 응답은 저장되어 있습니다.'); }
    });
    const card = (title, chip, desc, actLabel, onAct, extra) => h('section', { class: 'card rv-card' },
      h('h3', null, title, chip), h('p', { class: 'd' }, desc),
      h('div', { class: 'act' }, h('button', { class: 'btn small', type: 'button', onclick: onAct }, actLabel)), extra);
    const okChip = done => h('span', { class: 'chip ' + (done ? 'ok' : 'warn') }, done ? '완료' : '미완료');
    return {
      body: [
        pageHead('4 · 확인 및 제출', '응답 내용을 확인하고 제출해 주십시오', st.submittedAt && st.editedAfterSubmit ? '제출 후 수정한 내용이 있습니다. 다시 제출하셔야 수정 내용이 반영됩니다.' : '모든 문항에 응답하시면 제출할 수 있습니다. 빠진 문항은 아래 버튼을 눌러 바로 이동하실 수 있습니다.'),
        h('div', { class: 'rv' },
          card('1부 평가항목 적절성', okChip(c1 === N), `${c1}/${N} 응답 · 유지 ${kept}개 · 조정 ${changed.length}개`, '1부 보기', () => go('p1'),
            [changed.length ? h('div', { class: 'changes' }, changed.map(id => h('span', { class: 'chip orange' }, `${id} ${R.r1[id]}점 → ${st.p1[id].score}점`))) : null,
              miss1.length ? h('div', { class: 'missing' }, miss1.map(c => h('button', { type: 'button', onclick: () => go('p1', () => { const el = document.getElementById(`p1-${c.id}`); if (el) el.scrollIntoView({ block: 'start' }); }) }, `${c.id} ${c.name}`))) : null]),
          card('2부 평가항목 중요도', okChip(c2 === PAIRS.length), `${c2}/${PAIRS.length} 비교` + (r ? ` · 일관성 비율 ${r.CR.toFixed(3)} (${r.CR <= 0.1 ? '기준 충족' : '기준 0.1 초과'})` : ''), '2부 보기', () => go('p2'),
            miss2.length ? h('div', { class: 'missing' }, miss2.map(p => h('button', { type: 'button', onclick: () => go('p2', () => jumpPair(pkey(p.i, p.j))) }, `비교 ${p.idx + 1} · ${CID[p.i]}↔${CID[p.j]}`))) : null),
          card('3부 후보 서비스 평가', okChip(c3 === ORDER.length), `${c3}/${ORDER.length} 서비스 완료 · 점수 ${p3Ratings()}/${ORDER.length * N}개 선택`, '3부 보기', () => { st.p3view = 'list'; go('p3'); },
            miss3.length ? h('div', { class: 'missing' }, miss3.slice(0, 40).map(o => h('button', { type: 'button', onclick: () => openSvc(o.idx) }, `${o.idx + 1}. ${o.s.name} (${svcCount(o.s.id)}/${N})`))) : null)),
        h('section', { class: 'card submit-box' },
          crBad ? h('label', { class: 'check', for: 'crack' }, ack, h('span', null, '2부 일관성 비율이 0.1을 넘지만, 현재 판단을 유지하고 제출합니다')) : null,
          submitBtn,
          !complete ? h('p', { class: 'note' }, `아직 선택하지 않은 문항이 ${remaining}개 있습니다.`) : null,
          h('p', { class: 'note' }, `제출 후에도 마감(${META.deadline}) 전까지 같은 링크로 수정하고 다시 제출하실 수 있습니다.`))
      ],
      nav: navbar({ label: '이전: 서비스 평가', on: () => { st.p3view = 'list'; go('p3'); } }, null, () => [complete ? '모든 문항 응답 완료' : `남은 문항 ${remaining}개`])
    };
  }

  /* ---------- 완료 ---------- */
  function viewDone() {
    if (!st.submittedAt) return viewReview();
    const r = ahp();
    const copy = h('section', { class: 'card copy', id: 'copy', hidden: true }, buildCopy(r));
    const toggle = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'copy' }, icon('doc'), '내 응답 사본 보기');
    toggle.addEventListener('click', () => { copy.hidden = !copy.hidden; toggle.setAttribute('aria-expanded', String(!copy.hidden)); toggle.lastChild.textContent = copy.hidden ? '내 응답 사본 보기' : '사본 접기'; });
    return {
      body: [
        h('section', { class: 'card done-hero' },
          h('div', { class: 'ok-ic' }, icon('check', { color: '#1F7A4D', sw: '2.6' })),
          h('h2', { id: 'pageTitle', tabindex: '-1' }, '응답이 제출되었습니다'),
          h('p', null, `${R.name} 위원님, 귀한 시간을 내어 주셔서 감사합니다. 2차 결과는 3차 조사(11월 23일~25일) 때 함께 공유해 드립니다.`),
          h('dl', { class: 'receipt-meta' }, h('dt', null, '접수 번호'), h('dd', null, st.receipt), h('dt', null, '제출 시각'), h('dd', null, fmtDT(st.submittedAt))),
          h('div', { class: 'done-actions' }, toggle,
            h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, icon('print'), '인쇄 · PDF로 저장'),
            h('button', { class: 'btn ghost', type: 'button', onclick: () => go('review') }, '응답 수정하기'))),
        copy,
        h('section', { class: 'card copy no-print' },
          h('h3', null, '공용 PC에서 응답하셨나요?'),
          h('p', { class: 'note', style: { marginBottom: '12px' } }, '제출한 응답은 연구진 서버에 보관됩니다. 공용 PC라면 이 기기에 남은 임시 저장 기록을 지워 주십시오.'),
          h('button', { class: 'btn small', type: 'button', onclick: () => { if (confirm('이 기기에 남은 임시 저장 기록을 지울까요? (샘플에서는 입력값이 모두 지워집니다)')) { Api.clear(token); token = null; renderGate(false, '이 기기의 임시 저장 기록을 지웠습니다.'); } } }, icon('lock'), '이 기기의 기록 지우기'))
      ],
      nav: null
    };
  }

  function buildCopy(r) {
    const tbl = (head, rows) => h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, head.map(x => h('th', { scope: 'col' }, x)))),
      h('tbody', null, rows.map(row => h('tr', null, row.map(x => h('td', null, x)))))));
    return [
      h('h3', null, `${R.name} 위원님 응답 사본 · 접수 ${st.receipt}`),
      h('h4', null, '1부 평가항목 적절성'),
      tbl(['평가항목', '1차', '2차', '구분'], C.map(c => { const sc = st.p1[c.id] && st.p1[c.id].score; return [`${c.id} ${c.name}`, `${R.r1[c.id]}점`, sc ? `${sc}점` : '-', sc === R.r1[c.id] ? '유지' : '조정']; })),
      h('h4', null, '2부 평가항목 중요도' + (r ? ` · 일관성 비율 ${r.CR.toFixed(3)}` : '')),
      r ? tbl(['평가항목', '가중치'], CID.map((id, i) => [`${id} ${C[i].name}`, `${(r.w[i] * 100).toFixed(1)}%`])) : null,
      tbl(['비교', '응답'], PAIRS.map(([i, j], idx) => { const a = st.p2[pkey(i, j)] || {}; const x = a.side === 'L' ? a.v : a.side === 'R' ? 1 / a.v : 1; return [`${idx + 1}. ${CID[i]} ↔ ${CID[j]}`, a.side ? ratioText(i, j, x) : '-']; })),
      h('h4', null, '3부 후보 서비스 평가'),
      tbl(['서비스', ...CID], ORDER.map((s, idx) => [`${idx + 1}. ${s.name}`, ...CID.map(id => (st.p3[s.id] && st.p3[s.id][id]) ? String(st.p3[s.id][id]) : '-')]))
    ];
  }

  /* ---------- 링크 확인 화면 ---------- */
  function renderGate(invalid, msg) {
    ui.steps = null; ui.mid = null; ui.save = null; st = null;
    const nodes = [];
    if (META.demo) nodes.push(demoBar());
    nodes.push(header());
    const demoLinks = META.demo ? h('div', { class: 'demo-links' },
      h('p', { class: 'note' }, '샘플 확인용 개인 링크 (가상 응답자 3명 · 1차 점수와 서비스 순서가 서로 다릅니다)'),
      Object.keys(S.respondents).map(t => { const p = S.respondents[t]; return h('a', { class: 'btn', href: `#t=${t}` }, h('span', null, `${p.name} · ${p.org}`), icon('arrowR')); })) : null;
    nodes.push(h('main', { id: 'main', tabindex: '-1' }, h('div', { class: 'wrap' },
      h('section', { class: 'card gate' },
        h('h1', { id: 'pageTitle', tabindex: '-1' }, msg ? '기록을 지웠습니다' : invalid ? '유효하지 않은 링크입니다' : '개인 링크로 접속해 주십시오'),
        h('p', null, msg || '이 조사는 전문가별 개인 링크로만 응답할 수 있습니다. 받으신 안내 메일의 링크를 다시 눌러 주십시오.'),
        h('p', { class: 'note', style: { marginTop: '10px' } }, `문의: ${META.contact} (예시)`),
        demoLinks))), footer());
    app.replaceChildren(...nodes);
  }

  /* ---------- 시작 ---------- */
  function readToken() {
    const m = location.hash.match(TOKEN_RE) || location.search.match(TOKEN_RE);
    if (m) {
      try { sessionStorage.setItem(SKEY, m[1]); } catch (e) { /* 무시 */ }
      history.replaceState(null, '', location.pathname); // 주소창·방문 기록에서 토큰 제거
      return m[1];
    }
    try { return sessionStorage.getItem(SKEY); } catch (e) { return null; }
  }

  const VIEWS = { intro: viewIntro, p1: viewP1, p2: viewP2, p3: viewP3, review: viewReview, done: viewDone };

  async function boot() {
    token = readToken();
    if (!token) { renderGate(false); return; }
    let res = null;
    try { res = await Api.load(token); } catch (e) { res = null; }
    if (!res) { try { sessionStorage.removeItem(SKEY); } catch (e) { /* 무시 */ } token = null; renderGate(true); return; }
    R = res.respondent;
    st = Object.assign(blank(), res.saved || {});
    ORDER = shuffled(S.services, hashStr(token));
    if (!st.consent) st.step = 'intro';
    render();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', boot);
  boot();
})();
