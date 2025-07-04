import { register } from "@shopify/web-pixels-extension";

register(({ analytics }) => {
  // 訂閱所有標準事件
  analytics.subscribe("all_standard_events", (event) => {
    // 產生 trackid，prefix 為 spfyex-
    const trackid = `spfyex-${Date.now()}`;
    // 組合送出資料，參考 pixel.js
    const payload = {
      event: event.name,
      data: event.data,
      trackid: trackid,
      timestamp: Date.now(),
    };
    // 發送到 violet.ghtinc.com
    fetch("https://violet.ghtinc.com/tracking/track/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });
});
