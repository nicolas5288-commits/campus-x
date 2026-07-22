// UniEmbassy service worker
// 極簡：只為了讓網站「可安裝成 App」，不做離線快取——
// 本站用 ?v= 版控，快取交給瀏覽器，SW 一律放行走網路，避免使用者卡在舊版。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* 不攔截，走瀏覽器預設網路請求 */ });
