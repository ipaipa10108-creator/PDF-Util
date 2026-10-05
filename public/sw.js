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
          const files = [];

          // 從 FormData 中收集所有 File 物件（相容 shared_files, pdf_files, 或是多個獨立欄位）
          for (const entry of formData.values()) {
            if (entry && typeof entry === "object" && typeof entry.arrayBuffer === "function") {
              files.push(entry);
            }
          }

          if (files.length > 0) {
            const cache = await caches.open(CACHE_NAME);
            
            // 清理舊的快取內容
            const existingKeys = await cache.keys();
            for (const req of existingKeys) {
              await cache.delete(req);
            }

            const fileMetaList = [];
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const fileKey = `/shared-file-${i}`;
              await cache.put(
                fileKey,
                new Response(file, {
                  headers: {
                    "Content-Type": file.type || "application/octet-stream",
                    "X-Filename": encodeURIComponent(file.name || `shared_file_${i + 1}`),
                  },
                })
              );
              fileMetaList.push({
                key: fileKey,
                name: file.name || `shared_file_${i + 1}`,
                type: file.type || "",
                size: file.size || 0,
              });
            }

            // 儲存檔案清單中繼資料
            await cache.put(
              "/shared-files-meta.json",
              new Response(JSON.stringify({ files: fileMetaList }), {
                headers: { "Content-Type": "application/json" },
              })
            );

            // 相容舊版第一筆
            if (files[0]) {
              await cache.put("/shared-file.pdf", new Response(files[0]));
            }

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
