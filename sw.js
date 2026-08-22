/* KOTATSU Service Worker
   最小構成: PWAインストール可能化 + 通知の表示/クリック + 簡易オフラインキャッシュ */
const CACHE = "kotatsu-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ネットワーク優先・失敗時はキャッシュ（同一オリジンのGETのみ保存）
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(event.request, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || Response.error())),
  );
});

// 通知クリック → サイトを開く/フォーカス
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

// 将来のWeb Push受信用（本番: プッシュサーバーからの新着通知をここで表示）
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* noop */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "KOTATSU（コタツ）", {
      body: data.body || "新しい記事が公開されました",
      icon: "icons/icon-192.png",
      data: { url: data.url || "./" },
    }),
  );
});
