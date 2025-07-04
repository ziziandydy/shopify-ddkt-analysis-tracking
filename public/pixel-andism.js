register(({ analytics }) => {
    console.log('[Pixel Extension] loaded for shop: andism.myshopify.com');
    console.log('[Pixel Extension] trackid: spfyex-YW5kaXNtLm15c2hvcGlmeS5jb20');

    analytics.subscribe("all_standard_events", (event) => {
        console.log('[Pixel Extension] event:', event.name);
        console.log('[Pixel Extension] event data:', event.data);

        const payload = {
            event: event.name,
            data: event.data,
            trackid: "spfyex-YW5kaXNtLm15c2hvcGlmeS5jb20",
            shop_domain: "andism.myshopify.com",
            timestamp: Date.now(),
        };

        console.log('[Pixel Extension] sending payload:', payload);

        fetch("https://violet.ghtinc.com/tracking/track/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Shopify-Pixel-Extension/1.0"
            },
            body: JSON.stringify(payload),
        })
            .then(response => {
                console.log('[Pixel Extension] response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('[Pixel Extension] response data:', data);
            })
            .catch(error => {
                console.error('[Pixel Extension] error:', error);
            });
    });

    // 測試事件 - 頁面載入時觸發
    console.log('[Pixel Extension] extension loaded successfully');
}); 