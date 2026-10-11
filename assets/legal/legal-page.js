// Baut privacy.html / imprint.html aus window.LEGAL in der Sprache aus ?lang= (oder der Gerätesprache)
(function () {
  const page = document.body.dataset.page;
  const other = page === 'privacy' ? 'imprint' : 'privacy';
  const langs = Object.keys(LEGAL);
  const names = { de: 'Deutsch', en: 'English' };
  const q = new URLSearchParams(location.search).get('lang');
  let lang = langs.includes(q) ? q
    : (navigator.languages || [navigator.language || 'en']).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => langs.includes(l)) || 'en';
  const fill = (s) => s.replace(/\{(name|address|email)\}/g, (m, k) => CONTACT[k]);
  const link = (s) => {
    const frag = document.createDocumentFragment();
    fill(s).split(/(https?:\/\/[^\s)]+)/).forEach((part, i) => {
      if (i % 2) {
        const a = document.createElement('a');
        a.href = part;
        a.textContent = part;
        a.rel = 'noopener';
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    return frag;
  };
  function render() {
    const L = LEGAL[lang];
    const P = L[page];
    document.documentElement.lang = lang;
    document.title = `${P.title} – Calcumeter`;
    const main = document.getElementById('main');
    main.replaceChildren();
    const h1 = document.createElement('h1');
    h1.textContent = P.title;
    main.appendChild(h1);
    for (const [head, text] of P.sections) {
      if (head) {
        const h = document.createElement('h2');
        h.textContent = head;
        main.appendChild(h);
      }
      for (const para of text.split('\n\n')) {
        const p = document.createElement('p');
        p.appendChild(link(para));
        main.appendChild(p);
      }
    }
    const u = document.createElement('p');
    u.className = 'updated';
    u.textContent = P.updated;
    main.appendChild(u);
    document.getElementById('langLabel').textContent = L.lang;
    const o = document.getElementById('other');
    o.textContent = L.other[page];
    o.href = `${other}.html?lang=${lang}`;
    const back = document.getElementById('back');
    back.textContent = L.back;
  }
  const sel = document.getElementById('lang');
  for (const l of langs) sel.appendChild(new Option(names[l] || l, l));
  sel.value = lang;
  sel.addEventListener('change', () => {
    lang = sel.value;
    history.replaceState(null, '', `?lang=${lang}`);
    render();
  });
  render();
})();
