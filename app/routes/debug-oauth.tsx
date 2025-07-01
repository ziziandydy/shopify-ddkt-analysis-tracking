import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getOAuthMonitor } from "../utils/oauth-monitor";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== OAuth 調試路由被觸發 ===");

    try {
        // 嘗試認證
        const result = await authenticate.admin(request);

        const monitor = getOAuthMonitor();
        const oauthSteps = monitor?.getSteps() || [];
        const oauthSummary = monitor?.getSummary() || null;

        return json({
            success: true,
            session: {
                id: result.session?.id,
                shop: result.session?.shop,
                isOnline: result.session?.isOnline,
                scope: result.session?.scope,
                hasAccessToken: !!result.session?.accessToken,
                expires: result.session?.expires
            },
            oauthSteps,
            oauthSummary,
            environment: {
                SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
                SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
                SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "未設定",
                SCOPES: process.env.SCOPES || "未設定",
                NODE_ENV: process.env.NODE_ENV || "未設定"
            }
        });
    } catch (error: any) {
        console.error("【Debug OAuth】認證失敗:", error);

        const monitor = getOAuthMonitor();
        const oauthSteps = monitor?.getSteps() || [];
        const oauthSummary = monitor?.getSummary() || null;

        return json({
            success: false,
            error: {
                message: error?.message,
                status: error?.status,
                statusText: error?.statusText,
                stack: error?.stack
            },
            oauthSteps,
            oauthSummary,
            environment: {
                SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
                SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
                SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "未設定",
                SCOPES: process.env.SCOPES || "未設定",
                NODE_ENV: process.env.NODE_ENV || "未設定"
            }
        }, { status: 500 });
    }
};

export default function DebugOAuth() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>OAuth 調試資訊</h1>

            <h2>認證狀態</h2>
            <div style={{
                padding: "10px",
                backgroundColor: data.success ? "#d4edda" : "#f8d7da",
                border: "1px solid",
                borderColor: data.success ? "#c3e6cb" : "#f5c6cb",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                {data.success ? "✅ 認證成功" : "❌ 認證失敗"}
            </div>

            {data.success && 'session' in data && data.session && (
                <div>
                    <h3>Session 資訊</h3>
                    <pre style={{
                        backgroundColor: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "4px",
                        overflow: "auto"
                    }}>
                        {JSON.stringify(data.session, null, 2)}
                    </pre>
                </div>
            )}

            {!data.success && 'error' in data && data.error && (
                <div>
                    <h3>錯誤資訊</h3>
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

            <h2>環境變數</h2>
            <pre style={{
                backgroundColor: "#f8f9fa",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto"
            }}>
                {JSON.stringify(data.environment, null, 2)}
            </pre>

            {data.oauthSummary && (
                <div>
                    <h2>OAuth 流程總結</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>Session ID:</strong> {data.oauthSummary.sessionId}</p>
                        <p><strong>總步驟數:</strong> {data.oauthSummary.totalSteps}</p>
                        <p><strong>成功步驟:</strong> {data.oauthSummary.successfulSteps}</p>
                        <p><strong>失敗步驟:</strong> {data.oauthSummary.failedSteps}</p>
                    </div>
                </div>
            )}

            {data.oauthSteps && data.oauthSteps.length > 0 && (
                <div>
                    <h2>OAuth 流程步驟</h2>
                    <div style={{ maxHeight: "400px", overflow: "auto" }}>
                        {data.oauthSteps.map((step, index) => (
                            <div key={index} style={{
                                margin: "5px 0",
                                padding: "10px",
                                backgroundColor: step.success ? "#d4edda" : "#f8d7da",
                                border: "1px solid",
                                borderColor: step.success ? "#c3e6cb" : "#f5c6cb",
                                borderRadius: "4px"
                            }}>
                                <div style={{ fontWeight: "bold" }}>
                                    {step.success ? "✅" : "❌"} {step.step}
                                </div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                    {step.timestamp}
                                </div>
                                {step.details && (
                                    <details style={{ marginTop: "5px" }}>
                                        <summary>詳細資訊</summary>
                                        <pre style={{
                                            fontSize: "12px",
                                            margin: "5px 0 0 0",
                                            whiteSpace: "pre-wrap"
                                        }}>
                                            {JSON.stringify(step.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {step.error && (
                                    <details style={{ marginTop: "5px" }}>
                                        <summary>錯誤資訊</summary>
                                        <pre style={{
                                            fontSize: "12px",
                                            margin: "5px 0 0 0",
                                            whiteSpace: "pre-wrap",
                                            color: "#721c24"
                                        }}>
                                            {JSON.stringify(step.error, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 