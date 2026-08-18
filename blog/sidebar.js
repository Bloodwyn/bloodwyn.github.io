// Renders the cross-post nav into the first `.sidebar` element on the page,
// from the shared BLOG_POSTS list in posts.js. Include both scripts (posts.js
// first) and an empty `<div class="sidebar"></div>` in `#container`.
(function () {
  function render() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || typeof BLOG_POSTS === 'undefined') return;
    const here = location.pathname.replace(/\/$/, '');
    sidebar.innerHTML = '';
    BLOG_POSTS.forEach(post => {
      const btn = document.createElement('button');
      btn.textContent = post.title;
      if (post.url.replace(/\/$/, '') === here) {
        btn.className = 'current';
      } else {
        btn.addEventListener('click', () => { location.href = post.url; });
      }
      sidebar.appendChild(btn);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
