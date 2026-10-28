/* JustAReminder Family - service worker for web push (15.13)
   This is plain JavaScript, not HTML, Markdown, or TypeScript.
   No API tokens, payments, access control, or offline copies of private data.
*/
'use strict';

const HOME_PATH = './family-dashboard.html';
const ICON_PATH = './family-icon-180.png';

function firstText(...items) {
  for (const value of items) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function safeLocalUrl(candidate) {
  const fallback = new URL(HOME_PATH, self.registration.scope).href;
  if (typeof candidate !== 'string' || !candidate.trim()) return fallback;
  try {
    const target = new URL(candidate, self.registration.scope);
    const scope = new URL(self.registration.scope);
    if (target.origin !== scope.origin || !target.href.startsWith(scope.href)) return fallback;
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return fallback;
    return target.href;
  } catch {
    return fallback;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Do not intercept network requests: private Supabase sessions and dashboards
// must never be stored in a Service Worker cache.

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      if (event.data) {
        const raw = event.data.text();
        try { payload = JSON.parse(raw); }
        catch { payload = { body: raw }; }
      }
    } catch { payload = {}; }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = { body: String(payload ?? '') };
    const notification = payload.notification && typeof payload.notification === 'object' ? payload.notification : {};
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    const details = notification.data && typeof notification.data === 'object' ? notification.data : {};
    const title = firstText(notification.title, payload.title, 'JustAReminder Family').slice(0, 120);
    const body = firstText(notification.body, payload.body, payload.message, data.body, 'Je hebt een nieuwe herinnering.').slice(0, 500);
    const url = safeLocalUrl(firstText(details.url, data.url, notification.url, payload.url, payload.click_url, payload.link));
    const tag = firstText(notification.tag, payload.tag).slice(0, 80);
    const icon = safeLocalUrl(firstText(notification.icon, payload.icon, ICON_PATH));
    const options = {
      body,
      icon,
      badge: new URL(ICON_PATH, self.registration.scope).href,
      data: { url },
    };
    if (tag) options.tag = tag;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = safeLocalUrl(event.notification?.data?.url);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = windows.find(c => c.url === url);
    if (same) { await same.focus(); return; }
    const familyWindow = windows.find(c => {
      try { return new URL(c.url).origin === self.location.origin; }
      catch { return false; }
    });
    if (familyWindow && typeof familyWindow.navigate === 'function') {
      const navigated = await familyWindow.navigate(url).catch(() => null);
      if (navigated) { await navigated.focus(); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
