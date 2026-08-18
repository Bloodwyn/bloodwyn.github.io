const viewer = document.getElementById('viewer');
const paperbar = document.getElementById('paperbar');

function e(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function parseHash() {
    const raw = location.hash ? location.hash.substring(1) : '';
    const slash = raw.indexOf('/');
    if (slash === -1) return { slug: raw || null, tab: 'paper' };
    return { slug: raw.slice(0, slash), tab: raw.slice(slash + 1) || 'paper' };
}

const PAGE_FOLDER = (() => {
    const p = location.pathname.split('/').pop().replace('.html', '');
    return p || 'index';
})();

function renderPaperBar(slug, activeTab) {
    if (!paperbar) return;
    const meta = (typeof papers !== 'undefined') ? papers[slug] : null;
    if (!slug || !meta) { paperbar.innerHTML = ''; return; }

    const tabs = [
        { id: 'paper',        label: 'Paper'        },
        meta.slides        && { id: 'slides',        label: 'Slides'        },
        meta.presentation  && { id: 'presentation',  label: 'Presentation'  },
        meta.demo          && { id: 'demo',          label: 'Demo'          },
        meta.code          && { id: 'code',          label: 'Code'          },
        ...(meta.extras || []),
        meta.reviews       && { id: 'reviews',       label: 'Reviews'       },
        { id: 'cite',         label: 'Cite'          },
    ].filter(Boolean);

    paperbar.innerHTML = tabs.map(t =>
        `<button class="paper-tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');

    paperbar.querySelectorAll('.paper-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            location.hash = `${slug}/${btn.dataset.tab}`;
        });
    });
}

function loadPDF(path) {
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) {
        viewer.innerHTML = `<img src="${e(path)}" alt="">`;
    } else {
        viewer.innerHTML = `<embed src="${e(path)}" type="application/pdf">`;
    }
}

function loadVideo(url) {
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
        viewer.innerHTML = `<video src="${e(url)}" controls></video>`;
    } else if (url.includes('/embed/')) {
        viewer.innerHTML = `<iframe src="${e(url)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        viewer.innerHTML = `<a class="video-link" href="${e(url)}" target="_blank" rel="noopener">Watch on YouTube ↗</a>`;
    }
}

function loadCode(url, lang, repo) {
    viewer.innerHTML = `<div class="code-loading">Loading…</div>`;
    fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.text();
        })
        .then(src => {
            const filename = (() => {
                try {
                    const u = new URL(url);
                    if (u.hostname === 'raw.githubusercontent.com') {
                        const parts = u.pathname.split('/').filter(Boolean);
                        return parts.slice(3).join('/'); // skip owner/repo/branch
                    }
                } catch {}
                return url.split('/').pop();
            })();
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = lang ? `language-${lang}` : '';
            code.textContent = src;
            pre.appendChild(code);

            const wrap = document.createElement('div');
            wrap.className = 'code-wrap';
            if (repo) {
                const bar = document.createElement('div');
                bar.className = 'code-bar';
                bar.innerHTML = `<a class="code-repo-link" href="${e(repo)}" target="_blank" rel="noopener"><svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>Visit GitHub Repository</a>`
                    + `<span class="code-filename">${e(filename)}</span>`;
                wrap.appendChild(bar);
            }
            wrap.appendChild(pre);

            viewer.innerHTML = '';
            viewer.appendChild(wrap);
            if (typeof hljs !== 'undefined') hljs.highlightElement(code);
        })
        .catch(err => {
            viewer.innerHTML = `<div class="viewer-message">Could not load file: ${e(String(err))}</div>`;
        });
}

function loadCite(bibtex) {
    const id = 'cite-pre-' + Math.random().toString(36).slice(2);
    viewer.innerHTML = `
      <div class="cite-block">
        <pre id="${id}">${e(bibtex)}</pre>
        <button class="copy-btn" onclick="
          navigator.clipboard.writeText(document.getElementById('${id}').textContent).then(()=>{
            this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy BibTeX',1500);
          });
        ">Copy BibTeX</button>
      </div>`;
}

const REVIEWS_NOTE = `These are the real, anonymized reviews this paper received before it was accepted for publication. A few papers on this site scored quite low with individual reviewers, and some of those went on to win Best Paper awards anyway. If your own reviews feel harsh, try not to take them too personally: it happens to everyone, and it doesn't mean your work is worthless.`;

function loadReviews(reviews) {
    // "Overall Recommendation" (COMFy), "Overall evaluation" (EasyChair), and "Overall
    // Judgement" (WSCG) all promote to the header pill. EasyChair's value is "verdict\n\n
    // full explanation" in one field, so only the verdict line becomes the pill; the
    // explanation stays in the card body instead of being dropped.
    const pillClass = v => /reject/i.test(v) ? 'pill-red'
        : /weak|borderline|marginal|dubious/i.test(v) ? 'pill-amber'
        : /accept|good|acceptable|excellent/i.test(v) ? 'pill-green'
        : 'pill-gray';

    // A review entry whose sole field is labeled "Metareview" is an area-chair summary,
    // not a numbered reviewer; it gets its own header and isn't counted in "Reviewer N".
    let reviewerNum = 0;
    const cards = reviews.map(fields => {
        const isMeta = fields.length === 1 && fields[0].label === 'Metareview';
        const headerLabel = isMeta ? 'Metareview' : `Reviewer ${++reviewerNum}`;
        const rec = isMeta ? null : fields.find(f => f.label === 'Overall Recommendation' || f.label === 'Overall evaluation' || f.label === 'Overall Judgement');
        let verdict = '', bodyFields = fields;
        if (rec) {
            const nl = rec.value.indexOf('\n');
            verdict = nl === -1 ? rec.value : rec.value.slice(0, nl);
            const remainder = nl === -1 ? '' : rec.value.slice(nl).replace(/^\n+/, '');
            bodyFields = fields
                .map(f => f === rec ? (remainder ? { label: f.label, value: remainder } : null) : f)
                .filter(Boolean);
        }
        return `<div class="review-card">
          <div class="review-card-header">
            <span class="review-reviewer">${headerLabel}</span>
            ${rec ? `<span class="review-pill ${pillClass(verdict)}">${e(verdict)}</span>` : ''}
          </div>
          ${isMeta
            ? `<div class="review-value">${e(bodyFields[0].value)}</div>`
            : bodyFields.map(f => `<div class="review-field">
              <div class="review-label">${e(f.label)}</div>
              <div class="review-value">${e(f.value)}</div>
            </div>`).join('')}
        </div>`;
    }).join('');

    viewer.innerHTML = `<div class="reviews-wrap">
      <div class="reviews-note">${REVIEWS_NOTE}</div>
      ${cards}
    </div>`;
}

function loadTab(slug, tab) {
    const meta = (typeof papers !== 'undefined') ? papers[slug] : null;
    const pdfPath = slug.includes('.') ? `${PAGE_FOLDER}/${slug}` : `${PAGE_FOLDER}/${slug}.pdf`;

    if (tab === 'paper') { loadPDF(pdfPath); return; }
    if (!meta) { loadPDF(pdfPath); return; }

    switch (tab) {
        case 'slides':
            if (meta.slides) {
                meta.slides.startsWith('http') ? loadVideo(meta.slides) : loadPDF(meta.slides);
            }
            break;
        case 'presentation':
            if (meta.presentation) loadVideo(meta.presentation);
            break;
        case 'demo':
            if (meta.demo) loadVideo(meta.demo);
            break;
        case 'code':
            if (meta.code) loadCode(meta.code.url, meta.code.lang, meta.code.repo);
            break;
        case 'reviews':
            if (meta.reviews) loadReviews(meta.reviews);
            break;
        case 'cite':
            loadCite(meta.cite || '');
            break;
        default: {
            const extra = (meta.extras || []).find(x => x.id === tab);
            if (extra) loadPDF(extra.url);
            else loadPDF(pdfPath);
        }
    }
}

// Highlights whichever sidebar button matches the current slug, the same
// ".current" class/style the blog posts use for their own cross-post nav
// (see blog/sidebar.js) -- one shared convention for "you are here" instead
// of two different-looking ones.
function updateSidebarHighlight(currentSlug) {
    document.querySelectorAll('.sidebar button').forEach(btn => {
        const match = (btn.getAttribute('onclick') || '').match(/location\.hash\s*=\s*(['"])(.*?)\1/);
        const btnSlug = match ? match[2].split('/')[0] : null;
        btn.classList.toggle('current', btnSlug === currentSlug);
    });
}

function loadFromHash() {
    const { slug, tab } = parseHash();

    if (!slug) {
        const first = document.querySelector('.sidebar button');
        if (first) first.click();
        return;
    }

    renderPaperBar(slug, tab);
    loadTab(slug, tab);
    updateSidebarHighlight(slug);
}

window.addEventListener('hashchange', loadFromHash);
window.addEventListener('DOMContentLoaded', loadFromHash);
