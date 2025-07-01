import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== Web Pixels 測試路由被觸發 ===");

    try {
        const { admin } = await authenticate.admin(request);

        // 獲取商店資訊
        const { body: shopInfo } = await (admin as any).rest.get({ path: 'shop' });

        return json({
            success: true,
            shop: shopInfo.body.shop,
            webPixelsConfig: {
                enabled: true,
                events: [
                    'page_view',
                    'product_view',
                    'cart_update',
                    'checkout_start',
                    'checkout_complete',
                    'search',
                    'collection_view'
                ],
                pixelVersions: [
                    {
                        name: '基礎版本',
                        url: '/pixel.js',
                        description: '原有的基礎追蹤功能'
                    },
                    {
                        name: 'Web Pixels API 版本',
                        url: '/pixel-webpixels.js',
                        description: '支援 Shopify Web Pixels API 的版本'
                    },
                    {
                        name: '進階版本',
                        url: '/pixel-webpixels-advanced.js',
                        description: '完整的 Web Pixels API 整合，包含更多事件和配置選項'
                    }
                ]
            }
        });
    } catch (error: any) {
        console.error("【Web Pixels】查詢失敗:", error);

        return json({
            success: false,
            error: {
                message: error?.message,
                status: error?.status,
                statusText: error?.statusText
            }
        }, { status: 500 });
    }
};

export default function WebPixelsTest() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>Shopify Web Pixels API 測試工具</h1>

            <h2>商店資訊</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <p><strong>商店名稱:</strong> {data.success && 'shop' in data ? data.shop.name : 'N/A'}</p>
                <p><strong>商店網域:</strong> {data.success && 'shop' in data ? data.shop.domain : 'N/A'}</p>
                <p><strong>商店郵箱:</strong> {data.success && 'shop' in data ? data.shop.email : 'N/A'}</p>
            </div>

            <h2>Web Pixels 配置</h2>
            <div style={{
                padding: "15px",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <h3>支援的事件類型</h3>
                <ul>
                    {data.success && 'webPixelsConfig' in data && data.webPixelsConfig.events.map((event: string, index: number) => (
                        <li key={index} style={{ margin: "5px 0" }}>
                            <code style={{ backgroundColor: "#f1f1f1", padding: "2px 6px", borderRadius: "3px" }}>
                                {event}
                            </code>
                        </li>
                    ))}
                </ul>
            </div>

            <h2>Pixel 版本選擇</h2>
            <div style={{ marginBottom: "20px" }}>
                {data.success && 'webPixelsConfig' in data && data.webPixelsConfig.pixelVersions.map((version: any, index: number) => (
                    <div key={index} style={{
                        margin: "10px 0",
                        padding: "15px",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #dee2e6",
                        borderRadius: "4px"
                    }}>
                        <h3>{version.name}</h3>
                        <p style={{ color: "#666", marginBottom: "10px" }}>{version.description}</p>
                        <div style={{
                            backgroundColor: "#f1f1f1",
                            padding: "10px",
                            borderRadius: "4px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            overflow: "auto"
                        }}>
                            <strong>URL:</strong> {version.url}
                        </div>
                        <div style={{ marginTop: "10px" }}>
                            <button
                                onClick={() => {
                                    const scriptUrl = `${window.location.origin}${version.url}?tid=spfy-test`;
                                    navigator.clipboard.writeText(scriptUrl);
                                    alert('URL 已複製到剪貼簿！');
                                }}
                                style={{
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    marginRight: "10px"
                                }}
                            >
                                複製 URL
                            </button>
                            <button
                                onClick={() => {
                                    const scriptUrl = `${window.location.origin}${version.url}?tid=spfy-test`;
                                    window.open(scriptUrl, '_blank');
                                }}
                                style={{
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                測試載入
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <h2>測試指南</h2>
            <div style={{
                padding: "15px",
                backgroundColor: "#fff3cd",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <h3>如何測試 Web Pixels API</h3>
                <ol>
                    <li><strong>選擇版本:</strong> 從上方選擇要測試的 Pixel 版本</li>
                    <li><strong>複製 URL:</strong> 點擊「複製 URL」按鈕複製腳本地址</li>
                    <li><strong>在商店中測試:</strong>
                        <ul>
                            <li>在您的 Shopify 商店中打開瀏覽器開發者工具</li>
                            <li>在控制台中輸入：<code>var script = document.createElement('script'); script.src = '複製的URL'; document.head.appendChild(script);</code></li>
                            <li>或者將腳本添加到主題的 &lt;head&gt; 標籤中</li>
                        </ul>
                    </li>
                    <li><strong>觀察事件:</strong> 在控制台中查看追蹤事件輸出</li>
                    <li><strong>測試不同頁面:</strong> 瀏覽產品頁、購物車、結帳頁面等</li>
                </ol>
            </div>

            <h2>事件測試</h2>
            <div style={{
                padding: "15px",
                backgroundColor: "#d4edda",
                borderRadius: "4px"
            }}>
                <h3>手動觸發測試事件</h3>
                <p>在商店頁面的控制台中執行以下代碼來測試事件追蹤：</p>
                <div style={{
                    backgroundColor: "#f8f9fa",
                    padding: "10px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    overflow: "auto"
                }}>
                    <pre>{`// 測試自定義事件
if (window.trackShopifyEvent) {
  window.trackShopifyEvent('test_event', {
    test_data: '這是一個測試事件',
    timestamp: new Date().toISOString()
  });
}

// 測試進階追蹤器
if (window.ShopifyPixelTracker) {
  window.ShopifyPixelTracker.setDebug(true);
  window.ShopifyPixelTracker.trackCustomEvent('manual_test', {
    message: '手動測試事件'
  });
}`}</pre>
                </div>
            </div>

            {!data.success && 'error' in data && data.error && (
                <div>
                    <h2>錯誤資訊</h2>
                    <pre style={{
                        backgroundColor: "#f8d7da",
                        padding: "10px",
                        borderRadius: "4px",
                        overflow: "auto"
                    }}>
                        {JSON.stringify(data.error, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
} 