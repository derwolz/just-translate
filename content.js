// Just Translate — swaps every foreign-language tweet's text with Grok's
// translation, fetched through X's own `api.x.com/2/grok/translation.json`
// endpoint using the user's existing cookie auth.
//
// X only renders its "Show translation" button on tweets where React sets
// isFocal=true (one per tweet-detail page) — so on timeline and profile views
// the button never appears. This script bypasses that UI gate and calls the
// same backend X would call, for every tweet as it enters the DOM.

const TARGET_LANG = (navigator.language || 'en').slice(0, 2);

const BEARER =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const inflight = new Map();

function getCsrf() {
  const m = document.cookie.match(/(?:^|; )ct0=([^;]+)/);
  return m ? m[1] : null;
}

function extractTweetId(article) {
  const link = article.querySelector('a[href*="/status/"][role="link"]')
    || article.querySelector('a[href*="/status/"]');
  const href = link?.getAttribute('href') || '';
  const m = href.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

async function translate(tweetId) {
  if (inflight.has(tweetId)) return inflight.get(tweetId);
  const csrf = getCsrf();
  if (!csrf) return null;
  const p = fetch('https://api.x.com/2/grok/translation.json', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      authorization: BEARER,
      'x-csrf-token': csrf,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': TARGET_LANG
    },
    body: JSON.stringify({ content_type: 'POST', id: tweetId, dst_lang: TARGET_LANG })
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j?.result?.text || null)
    .catch(() => null);
  inflight.set(tweetId, p);
  return p;
}

function languageName(code) {
  try {
    return new Intl.DisplayNames([TARGET_LANG], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
}

function applyTranslation(article, translated, srcLang) {
  const tweetText = article.querySelector('[data-testid="tweetText"]');
  if (!tweetText || tweetText.dataset.jtDone === '1') return;
  tweetText.dataset.jtDone = '1';

  const originalHTML = tweetText.innerHTML;
  tweetText.textContent = translated;
  tweetText.setAttribute('lang', TARGET_LANG);
  tweetText.style.whiteSpace = 'pre-wrap';

  const banner = document.createElement('div');
  banner.className = 'jt-banner';
  banner.setAttribute('dir', 'auto');
  banner.style.cssText =
    'margin:4px 0 8px;color:rgb(113,118,123);font-size:13px;line-height:16px;';

  const label = document.createElement('span');
  label.textContent = `Translated from ${languageName(srcLang)} · `;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Show original';
  toggle.style.cssText =
    'background:none;border:0;padding:0;color:rgb(29,155,240);cursor:pointer;font:inherit;';

  let showingOriginal = false;
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showingOriginal) {
      tweetText.textContent = translated;
      tweetText.setAttribute('lang', TARGET_LANG);
      toggle.textContent = 'Show original';
    } else {
      tweetText.innerHTML = originalHTML;
      tweetText.setAttribute('lang', srcLang);
      toggle.textContent = 'Show translation';
    }
    showingOriginal = !showingOriginal;
  });

  banner.append(label, toggle);
  tweetText.parentNode.insertBefore(banner, tweetText);
}

async function processArticle(article) {
  if (article.dataset.jtSeen === '1') return;
  const tweetText = article.querySelector('[data-testid="tweetText"]');
  if (!tweetText) return;
  const srcLang = tweetText.getAttribute('lang');
  if (!srcLang || srcLang === TARGET_LANG || srcLang === 'und') return;
  article.dataset.jtSeen = '1';
  const id = extractTweetId(article);
  if (!id) {
    delete article.dataset.jtSeen;
    return;
  }
  const translated = await translate(id);
  if (translated) applyTranslation(article, translated, srcLang);
  else delete article.dataset.jtSeen;
}

function scan(root) {
  if (!root) return;
  const articles =
    root.matches?.('article[data-testid="tweet"]')
      ? [root]
      : root.querySelectorAll?.('article[data-testid="tweet"]') || [];
  articles.forEach(processArticle);
}

scan(document.body);

new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === 1) scan(n);
    }
  }
}).observe(document.body, { childList: true, subtree: true });
