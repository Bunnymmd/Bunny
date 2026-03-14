// Service Worker 必须包含 fetch 监听以满足安装要求
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  // 保持空逻辑即可触发安装
});
