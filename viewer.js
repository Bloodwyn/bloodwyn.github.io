const viewer = document.getElementById('viewer');

function e(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function getPathFromHash() {
    const page = location.pathname.split('/').pop().replace('.html', '');
    const hash = location.hash ? location.hash.substring(1) : null;


    const file = hash || defaults[page];
    if (!file) return null;
    return `${page}/${file}`;
}

function loadFromHash() {
    const hash = location.hash ? location.hash.substring(1) : null;
    if (hash == null) {
        document.querySelector('.sidebar button').click();
        return;
    }
    const page = location.pathname.includes('.html') ? location.pathname.split('/').pop().replace('.html', '') : 'index';
    file = `${page}/${hash}`;

    const ext = file.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
        viewer.innerHTML = `<embed src="${e(file)}" type="application/pdf">`;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
        viewer.innerHTML = `<img src="${e(file)}" alt="">`;
    } else {
        viewer.innerHTML = `<div>Unsupported: ${e(file)}</div>`;
    }
}

window.addEventListener('hashchange', loadFromHash);
window.addEventListener('DOMContentLoaded', loadFromHash);
