/* 여행 일정 네비 PWA - Service Worker */
var CACHE = "wtrip-v23.8-20260814";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

/* v23.4 새 버전이 준비되면 대기하지 않고 바로 적용 */
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
});

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
      .then(function () {
        return self.clients.matchAll({ type: "window" }).then(function (cs) {
          cs.forEach(function (c) { c.postMessage({ type: "sw-updated", cache: CACHE }); });
        });
      })
  );
});

/* index.html은 항상 최신(네트워크 우선) → 새 배포가 즉시 반영됨 */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  /* v22.6 GitHub Pages 는 HTML 에 Cache-Control: max-age 를 붙인다.
     그대로 두면 서비스워커가 fetch 해도 브라우저 HTTP 캐시의 옛 index.html 이 와서
     새 파일을 올려도 옛 버전이 계속 보인다. → 문서 요청은 캐시를 건너뛴다. */
  var isDoc = (e.request.mode === "navigate") ||
              /(\/|\.html)$/.test(new URL(e.request.url).pathname);
  var req = isDoc ? new Request(e.request.url, { cache: "no-store" }) : e.request;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (m) {
        return m || caches.match("./index.html");
      });
    })
  );
});
