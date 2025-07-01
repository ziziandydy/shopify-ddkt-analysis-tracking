import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { logCookieInfo, logCookieHeaders, parseCookieHeader, analyzeCookies } from "../utils/cookie-logger";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== Cookie 調試路由被觸發 ===");

    try {
        // 記錄詳細的 Cookie 資訊
        logCookieHeaders("Cookie Debug", request);
        const analysis = logCookieInfo("Cookie Debug", request);

        // 解析原始 Cookie 標頭
        const cookieHeader = request.headers.get("cookie");
        const cookies = parseCookieHeader(cookieHeader);

        // 獲取所有標頭資訊
        const allHeaders: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            allHeaders[key] = value;
        });

        // 環境資訊
        const environmentInfo = {
            NODE_ENV: process.env.NODE_ENV,
            SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? '已設定' : '未設定',
            SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? '已設定' : '未設定',
            SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || '未設定',
            SCOPES: process.env.SCOPES || '未設定',
            platform: process.platform,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };

        return json({
            success: true,
            cookieAnalysis: analysis,
            rawCookieHeader: cookieHeader,
            parsedCookies: cookies,
            allHeaders,
            environmentInfo,
            requestInfo: {
                url: request.url,
                method: request.method,
                userAgent: request.headers.get("user-agent"),
                referer: request.headers.get("referer"),
                host: request.headers.get("host"),
                accept: request.headers.get("accept"),
                acceptLanguage: request.headers.get("accept-language"),
                acceptEncoding: request.headers.get("accept-encoding"),
                connection: request.headers.get("connection"),
                upgradeInsecureRequests: request.headers.get("upgrade-insecure-requests"),
                secFetchDest: request.headers.get("sec-fetch-dest"),
                secFetchMode: request.headers.get("sec-fetch-mode"),
                secFetchSite: request.headers.get("sec-fetch-site"),
                secFetchUser: request.headers.get("sec-fetch-user"),
                secChUa: request.headers.get("sec-ch-ua"),
                secChUaMobile: request.headers.get("sec-ch-ua-mobile"),
                secChUaPlatform: request.headers.get("sec-ch-ua-platform")
            }
        });
    } catch (error: any) {
        console.error("【Cookie Debug】調試過程發生錯誤:", error);

        return json({
            success: false,
            error: {
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            },
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
};

export default function CookieDebug() {
    const data = useLoaderData<typeof loader>();

    if (!data.success) {
        return (
            <div style={{ padding: "20px", fontFamily: "monospace" }}>
                <h1>Cookie 調試錯誤</h1>
                <div style={{
                    padding: "10px",
                    backgroundColor: "#f8d7da",
                    borderRadius: "4px",
                    marginBottom: "20px"
                }}>
                    <p><strong>錯誤:</strong> {(data as any).error?.message}</p>
                    <p><strong>時間戳:</strong> {(data as any).timestamp}</p>
                </div>
            </div>
        );
    }

    const successData = data as any;

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>Cookie 詳細調試</h1>

            <h2>Cookie 分析摘要</h2>
            <div style={{
                padding: "10px",
                backgroundColor: data.cookieAnalysis.totalCookies > 0 ? "#d4edda" : "#f8d7da",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <p><strong>總 Cookie 數量:</strong> {successData.cookieAnalysis.totalCookies}</p>
                <p><strong>Session Cookie:</strong> {successData.cookieAnalysis.sessionCookies}</p>
                <p><strong>Persistent Cookie:</strong> {successData.cookieAnalysis.persistentCookies}</p>
                <p><strong>Secure Cookie:</strong> {successData.cookieAnalysis.secureCookies}</p>
                <p><strong>HttpOnly Cookie:</strong> {successData.cookieAnalysis.httpOnlyCookies}</p>
                <p><strong>Shopify Cookie:</strong> {successData.cookieAnalysis.shopifyCookies}</p>
                <p><strong>Custom Cookie:</strong> {successData.cookieAnalysis.customCookies}</p>
            </div>

            {successData.cookieAnalysis.missingCookies.length > 0 && (
                <div>
                    <h2>缺少的重要 Cookie</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#fff3cd",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <ul>
                            {successData.cookieAnalysis.missingCookies.map((cookie: string, index: number) => (
                                <li key={index}><strong>{cookie}</strong></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {successData.cookieAnalysis.recommendations.length > 0 && (
                <div>
                    <h2>建議</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#e7f3ff",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <ul>
                            {successData.cookieAnalysis.recommendations.map((rec: string, index: number) => (
                                <li key={index}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <h2>原始 Cookie 標頭</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <pre style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    fontSize: "12px"
                }}>
                    {successData.rawCookieHeader || "未設定"}
                </pre>
            </div>

            {successData.parsedCookies.length > 0 && (
                <div>
                    <h2>解析後的 Cookie 詳情</h2>
                    {successData.parsedCookies.map((cookie: any, index: number) => (
                        <div key={index} style={{
                            padding: "10px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "4px",
                            marginBottom: "10px"
                        }}>
                            <h3>{cookie.name}</h3>
                            <p><strong>值:</strong> {cookie.value.length > 100 ? cookie.value.substring(0, 100) + '...' : cookie.value}</p>
                            <p><strong>完整值:</strong> <code style={{ fontSize: "10px", wordBreak: "break-all" }}>{cookie.value}</code></p>
                            {cookie.domain && <p><strong>Domain:</strong> {cookie.domain}</p>}
                            {cookie.path && <p><strong>Path:</strong> {cookie.path}</p>}
                            {cookie.expires && <p><strong>Expires:</strong> {cookie.expires}</p>}
                            {cookie.maxAge && <p><strong>Max-Age:</strong> {cookie.maxAge}</p>}
                            {cookie.secure && <p><strong>Secure:</strong> ✅</p>}
                            {cookie.httpOnly && <p><strong>HttpOnly:</strong> ✅</p>}
                            {cookie.sameSite && <p><strong>SameSite:</strong> {cookie.sameSite}</p>}
                        </div>
                    ))}
                </div>
            )}

            <h2>請求資訊</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <p><strong>URL:</strong> {successData.requestInfo.url}</p>
                <p><strong>方法:</strong> {successData.requestInfo.method}</p>
                <p><strong>User-Agent:</strong> {successData.requestInfo.userAgent}</p>
                <p><strong>Referer:</strong> {successData.requestInfo.referer || "未設定"}</p>
                <p><strong>Host:</strong> {successData.requestInfo.host}</p>
                <p><strong>Accept:</strong> {successData.requestInfo.accept}</p>
                <p><strong>Accept-Language:</strong> {successData.requestInfo.acceptLanguage}</p>
                <p><strong>Accept-Encoding:</strong> {successData.requestInfo.acceptEncoding}</p>
                <p><strong>Connection:</strong> {successData.requestInfo.connection}</p>
                <p><strong>Upgrade-Insecure-Requests:</strong> {successData.requestInfo.upgradeInsecureRequests}</p>
                <p><strong>Sec-Fetch-Dest:</strong> {successData.requestInfo.secFetchDest}</p>
                <p><strong>Sec-Fetch-Mode:</strong> {successData.requestInfo.secFetchMode}</p>
                <p><strong>Sec-Fetch-Site:</strong> {successData.requestInfo.secFetchSite}</p>
                <p><strong>Sec-Fetch-User:</strong> {successData.requestInfo.secFetchUser}</p>
                <p><strong>Sec-CH-UA:</strong> {successData.requestInfo.secChUa}</p>
                <p><strong>Sec-CH-UA-Mobile:</strong> {successData.requestInfo.secChUaMobile}</p>
                <p><strong>Sec-CH-UA-Platform:</strong> {successData.requestInfo.secChUaPlatform}</p>
            </div>

            <h2>環境資訊</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <p><strong>Node 環境:</strong> {successData.environmentInfo.NODE_ENV}</p>
                <p><strong>Shopify API Key:</strong> {successData.environmentInfo.SHOPIFY_API_KEY}</p>
                <p><strong>Shopify API Secret:</strong> {successData.environmentInfo.SHOPIFY_API_SECRET}</p>
                <p><strong>Shopify App URL:</strong> {successData.environmentInfo.SHOPIFY_APP_URL}</p>
                <p><strong>SCOPES:</strong> {successData.environmentInfo.SCOPES}</p>
                <p><strong>平台:</strong> {successData.environmentInfo.platform}</p>
                <p><strong>Node 版本:</strong> {successData.environmentInfo.nodeVersion}</p>
                <p><strong>時間戳:</strong> {successData.environmentInfo.timestamp}</p>
            </div>

            <h2>所有 HTTP 標頭</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <pre style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    fontSize: "12px"
                }}>
                    {JSON.stringify(successData.allHeaders, null, 2)}
                </pre>
            </div>

            <div style={{
                padding: "10px",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px"
            }}>
                <button
                    onClick={() => window.location.reload()}
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
                    重新檢查
                </button>
                <a
                    href="/debug-oauth"
                    style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        textDecoration: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        marginRight: "10px"
                    }}
                >
                    OAuth 調試
                </a>
                <a
                    href="/db-test"
                    style={{
                        backgroundColor: "#ffc107",
                        color: "black",
                        textDecoration: "none",
                        padding: "8px 16px",
                        borderRadius: "4px"
                    }}
                >
                    資料庫測試
                </a>
            </div>
        </div>
    );
} 