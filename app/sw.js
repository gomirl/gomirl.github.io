// MIRL service worker: shows phone notifications and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'MIRL', {
      body: d.body || '',
      icon: d.title === 'New activity' ? '/icon-plain-192.png' : '/icon-192.png',
      badge: d.title === 'New activity' ? '/icon-plain-192.png' : '/icon-192.png',
      tag: d.tag || undefined,
      data: { url: d.url || '/app/' }
    }),
    bumpBadge()
  ]));
});

// Red number on the home-screen icon. The app writes the real count when it's open; each alert adds one until then.
async function bumpBadge() {
  try {
    const c = await caches.open('mirl-badge');
    const r = await c.match('/app/badge-count');
    const n = (parseInt(r ? await r.text() : '0', 10) || 0) + 1;
    await c.put('/app/badge-count', new Response(String(n)));
    const nav = self.navigator;
    if (nav && nav.setAppBadge) await nav.setAppBadge(n);
  } catch (err) {}
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/app/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
    for (const w of wins) {
      if (w.url.includes('/app/')) { return w.focus().then(() => w.navigate ? w.navigate(url) : null); }
    }
    return self.clients.openWindow(url);
  }));
});
