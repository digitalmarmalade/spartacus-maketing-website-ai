/* Public news pages: anonymous requests only; no raw CMS HTML is rendered. */
(async () => {
  const article = document.querySelector('article.article');
  const list = document.querySelector('.news-list-wrapper > [role="list"]');
  const empty = document.querySelector('.news-list-wrapper > .w-dyn-empty');
  const template = list.firstElementChild.cloneNode(true);
  const api = document.querySelector('meta[name="cms-api"]')?.content || '/cms-api';
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const safeURL = value => {
    try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
    catch { return null; }
  };
  const categories = post => (post.categories || []).filter(c => c && typeof c === 'object' && c.status === 'published');
  const date = post => post.publishedAt && !isNaN(Date.parse(post.publishedAt))
    ? new Date(post.publishedAt).toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'}) : '';
  function tags(container, post) {
    container.replaceChildren(...categories(post).map(c => el('div', c.name, 'tag')));
  }
  function image(node, url, alt) {
    const src = safeURL(url);
    node.hidden = !src;
    if (src) { node.src = src; node.alt = alt || ''; }
    else node.removeAttribute('src');
  }
  function renderCards(posts, message = 'No published articles yet.') {
    list.replaceChildren();
    empty.style.display = posts.length ? 'none' : 'block';
    empty.firstElementChild.textContent = message;
    for (const post of posts) {
      const card = template.cloneNode(true);
      card.querySelectorAll('[data-w-id]').forEach(n => n.removeAttribute('data-w-id'));
      card.querySelectorAll('.w-dyn-bind-empty').forEach(n => n.classList.remove('w-dyn-bind-empty'));
      const link = card.querySelector('a');
      link.href = `detail_post.html?slug=${encodeURIComponent(post.slug)}`;
      link.setAttribute('aria-label', post.title);
      card.querySelector('.news-title').textContent = post.title;
      card.querySelector('.article-published-date').textContent = date(post);
      card.querySelector('.article-teaser').textContent = post.excerpt || '';
      image(card.querySelector('img'), post.thumbnailImageURL || post.mainImageURL, post.title);
      tags(card.querySelector('.tag-list'), post);
      list.append(card);
    }
  }
  // Allowlisted Lexical nodes and DOM textContent keep CMS text out of innerHTML.
  function rich(node) {
    if (!node) return document.createDocumentFragment();
    if (node.type === 'text') {
      let n = document.createTextNode(node.text || '');
      for (const [bit, tag] of [[1,'strong'],[2,'em'],[8,'u'],[16,'code'],[4,'s']]) {
        if (node.format & bit) { const wrap = el(tag); wrap.append(n); n = wrap; }
      }
      return n;
    }
    if (node.type === 'linebreak') return el('br');
    if (node.type === 'block') {
      const fields = node.fields || {};
      if (fields.blockType === 'sourceImage') {
        const img = el('img'); image(img, fields.url, fields.alt); img.loading = 'lazy'; img.style.maxWidth = '100%'; return img;
      }
      if (fields.blockType === 'sourceVideo') {
        const src = safeURL(fields.url);
        if (!src) return document.createDocumentFragment();
        const url = new URL(src);
        if (!['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname) || !/^\/embed\/[a-zA-Z0-9_-]+$/.test(url.pathname)) return document.createDocumentFragment();
        const frame = el('iframe'); frame.src = src; frame.title = fields.title || 'Article video';
        frame.loading = 'lazy'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.style.cssText = 'width:100%;aspect-ratio:16/9;border:0'; return frame;
      }
      return document.createDocumentFragment();
    }
    const tag = {paragraph:'p',quote:'blockquote',list:node.listType === 'number' ? 'ol':'ul',listitem:'li',heading:/^h[1-6]$/.test(node.tag) ? node.tag : 'h2',link:'a',autolink:'a'}[node.type];
    const parent = tag ? el(tag) : document.createDocumentFragment();
    if (tag === 'a') {
      const href = safeURL(node.fields?.url || node.url);
      if (href) { parent.href = href; parent.rel = 'noopener noreferrer'; }
    }
    if (tag === 'ol' && Number.isInteger(node.start)) parent.start = node.start;
    for (const child of node.children || []) parent.append(rich(child));
    return parent;
  }
  async function fetchPosts(extra = {}) {
    const all = []; let page = 1; let data;
    do {
      const query = new URLSearchParams({'where[status][equals]':'published', depth:'1', limit:'100', sort:'-publishedAt', page:String(page), ...extra});
      const response = await fetch(`${api}/posts?${query}`, {credentials:'omit', cache:'no-store', signal:AbortSignal.timeout(25000)});
      if (!response.ok) throw new Error('CMS unavailable');
      data = await response.json();
      all.push(...data.docs.filter(p => p.status === 'published')); page++;
    } while (data.hasNextPage);
    return all;
  }
  list.replaceChildren();
  empty.style.display = 'block'; empty.firstElementChild.textContent = 'Loading news…';
  const filters = document.querySelector('.categories-list');
  if (filters) {
    filters.replaceChildren();
    filters.parentElement.querySelector('.w-dyn-empty').style.display = 'none';
    document.querySelector('#wf-form-Filter-News').addEventListener('submit', e => e.preventDefault());
  }
  try {
    if (article) {
      const slug = new URLSearchParams(location.search).get('slug');
      const posts = slug ? await fetchPosts({'where[slug][equals]':slug}) : [];
      const post = posts[0];
      const title = article.querySelector('h1');
      article.querySelectorAll('.w-dyn-bind-empty').forEach(n => n.classList.remove('w-dyn-bind-empty'));
      article.querySelectorAll('.w-dyn-empty').forEach(n => n.style.display = 'none');
      if (!post) {
        title.textContent = 'Article not found'; document.title = 'Article not found | Spartacus';
        article.querySelector('.article-image').parentElement.hidden = true;
        article.querySelector('.w-richtext').append(el('p', 'This article is unavailable or has not been published.'));
        renderCards([]); return;
      }
      title.textContent = post.title; document.title = `${post.title} | Spartacus`;
      article.querySelector('.article-published-date').textContent = date(post);
      tags(article.querySelector('.tag-list'), post);
      image(article.querySelector('.article-image'), post.mainImageURL, post.title);
      article.querySelector('.article-image').parentElement.removeAttribute('style');
      article.querySelector('.w-richtext').replaceChildren(rich(post.body?.root));
      const others = (await fetchPosts()).filter(p => p.id !== post.id);
      const ids = new Set(categories(post).map(c => c.id));
      others.sort((a,b) => Number(categories(b).some(c => ids.has(c.id))) - Number(categories(a).some(c => ids.has(c.id))));
      renderCards(others.slice(0,3));
    } else {
      const posts = await fetchPosts();
      renderCards(posts);
      const options = new Map(posts.flatMap(p => categories(p).map(c => [c.id,c])));
      for (const category of [...options.values()].sort((a,b) => a.name.localeCompare(b.name))) {
        const label = el('label', '', 'checkbox-field-2');
        const input = el('input'); input.type = 'checkbox'; input.value = String(category.id);
        label.append(input, el('span', category.name, 'checkbox-label is-filter')); filters.append(label);
        input.addEventListener('change', () => {
          const selected = new Set([...filters.querySelectorAll('input:checked')].map(n => n.value));
          renderCards(posts.filter(p => !selected.size || categories(p).some(c => selected.has(String(c.id)))), 'No articles match the selected categories.');
        });
      }
      filters.closest('.container-filters').hidden = !options.size;
    }
  } catch (error) {
    renderCards([], 'News is temporarily unavailable. Please try again.');
    if (article && !article.querySelector('h1').textContent) {
      article.querySelector('h1').textContent = 'Article temporarily unavailable';
      article.querySelector('.article-image').parentElement.hidden = true;
    }
    console.error('Unable to load news', error);
  }
})();
