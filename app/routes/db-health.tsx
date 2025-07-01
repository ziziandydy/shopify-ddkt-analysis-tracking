import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { testDatabaseConnection, checkDatabaseHealth } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== 資料庫健康檢查路由被觸發 ===");

    try {
        // 基本健康檢查
        const healthCheck = await checkDatabaseHealth();

        // 詳細連接測試
        const connectionTest = await testDatabaseConnection();

        // 環境資訊
        const environmentInfo = {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? '已設定' : '未設定',
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };

        return json({
            success: true,
            timestamp: new Date().toISOString(),
            healthCheck,
            connectionTest,
            environmentInfo
        });
    } catch (error: any) {
        console.error("【DB Health】健康檢查失敗:", error);

        return json({
            success: false,
            timestamp: new Date().toISOString(),
            error: {
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            }
        }, { status: 500 });
    }
};

export default function DatabaseHealth() {
    const data = useLoaderData<typeof loader>();

    // 類型斷言來處理成功和失敗的情況
    const successData = data.success ? data as any : null;

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>資料庫健康檢查</h1>

            <h2>檢查狀態</h2>
            <div style={{
                padding: "10px",
                backgroundColor: data.success ? "#d4edda" : "#f8d7da",
                border: "1px solid",
                borderColor: data.success ? "#c3e6cb" : "#f5c6cb",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                {data.success ? "✅ 檢查完成" : "❌ 檢查失敗"}
            </div>

            {data.success && (
                <>
                    <h2>基本健康檢查</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>狀態:</strong> {successData?.healthCheck?.status}</p>
                        <p><strong>回應時間:</strong> {successData?.healthCheck?.responseTime}ms</p>
                        <p><strong>時間戳:</strong> {successData?.healthCheck?.timestamp}</p>
                        {successData?.healthCheck?.error && (
                            <p><strong>錯誤:</strong> {successData.healthCheck.error}</p>
                        )}
                    </div>

                    <h2>連接測試</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: successData?.connectionTest?.success ? "#d4edda" : "#f8d7da",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>連接狀態:</strong> {successData?.connectionTest?.success ? "✅ 成功" : "❌ 失敗"}</p>
                        {successData?.connectionTest?.sessionCount !== undefined && (
                            <p><strong>Session 記錄數:</strong> {successData.connectionTest.sessionCount}</p>
                        )}
                        {successData?.connectionTest?.error && (
                            <div>
                                <p><strong>錯誤訊息:</strong> {successData.connectionTest.error.message}</p>
                                <p><strong>錯誤代碼:</strong> {successData.connectionTest.error.code}</p>
                                {successData.connectionTest.error.meta && (
                                    <p><strong>錯誤詳情:</strong> {JSON.stringify(successData.connectionTest.error.meta)}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <h2>環境資訊</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>Node 環境:</strong> {successData?.environmentInfo?.NODE_ENV}</p>
                        <p><strong>資料庫 URL:</strong> {successData?.environmentInfo?.DATABASE_URL}</p>
                        <p><strong>平台:</strong> {successData?.environmentInfo?.platform}</p>
                        <p><strong>Node 版本:</strong> {successData?.environmentInfo?.nodeVersion}</p>
                        <p><strong>運行時間:</strong> {Math.round(successData?.environmentInfo?.uptime || 0)}秒</p>

                        <h3>記憶體使用</h3>
                        <p><strong>RSS:</strong> {Math.round((successData?.environmentInfo?.memoryUsage?.rss || 0) / 1024 / 1024)}MB</p>
                        <p><strong>Heap Used:</strong> {Math.round((successData?.environmentInfo?.memoryUsage?.heapUsed || 0) / 1024 / 1024)}MB</p>
                        <p><strong>Heap Total:</strong> {Math.round((successData?.environmentInfo?.memoryUsage?.heapTotal || 0) / 1024 / 1024)}MB</p>
                    </div>
                </>
            )}

            <h2>故障排除建議</h2>
            <div style={{
                padding: "15px",
                backgroundColor: "#fff3cd",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <h3>連接池超時問題</h3>
                <ul>
                    <li><strong>檢查 DATABASE_URL:</strong> 確認資料庫連接字串正確</li>
                    <li><strong>資料庫負載:</strong> 檢查資料庫是否過載</li>
                    <li><strong>網路連接:</strong> 確認網路連接穩定</li>
                    <li><strong>連接限制:</strong> 檢查資料庫連接數限制</li>
                </ul>

                <h3>無伺服器環境優化</h3>
                <ul>
                    <li><strong>連接池大小:</strong> 減少連接池大小</li>
                    <li><strong>超時設定:</strong> 調整連接超時時間</li>
                    <li><strong>連接重用:</strong> 避免頻繁創建連接</li>
                </ul>

                <h3>常見解決方案</h3>
                <ul>
                    <li>重新部署應用程式</li>
                    <li>檢查資料庫服務狀態</li>
                    <li>增加資料庫資源</li>
                    <li>使用連接池管理工具</li>
                </ul>
            </div>

            <h2>即時監控</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px"
            }}>
                <p>頁面會自動刷新以監控資料庫狀態</p>
                <p><strong>最後更新:</strong> {data.timestamp}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    手動刷新
                </button>
            </div>

            {!data.success && (data as any).error && (
                <div>
                    <h2>錯誤詳情</h2>
                    <pre style={{
                        backgroundColor: "#f8d7da",
                        padding: "10px",
                        borderRadius: "4px",
                        overflow: "auto"
                    }}>
                        {JSON.stringify((data as any).error, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
} 