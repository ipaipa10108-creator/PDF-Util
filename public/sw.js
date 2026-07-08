// Service Worker for Local PDF Web Suite (PWA Share Target)

const CACHE_NAME = "shared-pdf-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 監聽並攔截來自系統分享的 POST 請求
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 檢查是否是發送給分享目標 (Share Target) 的 POST 請求
  // 由於 GitHub Pages 的 basePath 是 /PDF-Util，我們檢查 pathname 是否以 /PDF-Util/ 結尾
  if (
    event.request.method === "POST" && 
    (url.pathname === "/PDF-Util/" || url.pathname === "/PDF-Util")
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get("pdf_files");

          if (file && file instanceof File) {
            // 將分享進來的 PDF 檔案包裝成 Response 暫存至 Cache Storage 中
            const cache = await caches.open(CACHE_NAME);
            await cache.put("/shared-file.pdf", new Response(file));

            // 以 303 Redirect 重導向到 GET 模式的首頁，並帶上 ?shared=true 參數
            return Response.redirect("/PDF-Util/?shared=true", 303);
          }
        } catch (error) {
          console.error("Service Worker error handling share POST request:", error);
        }

        // 若失敗則直接重導向回首頁
        return Response.redirect("/PDF-Util/", 303);
      })()
    );
    return;
  }
});
