import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== 資料庫連接測試開始 ===");

    const results = {
        timestamp: new Date().toISOString(),
        tests: [] as any[]
    };

    // 測試 1: 基本連接
    try {
        console.log("【DB Test】測試 1: 基本連接");
        const startTime = Date.now();
        await prisma.$connect();
        const connectTime = Date.now() - startTime;

        results.tests.push({
            name: "基本連接",
            status: "success",
            duration: connectTime,
            message: "資料庫連接成功"
        });
        console.log("【DB Test】基本連接成功，耗時:", connectTime, "ms");
    } catch (error: any) {
        console.error("【DB Test】基本連接失敗:", error);
        results.tests.push({
            name: "基本連接",
            status: "error",
            error: error?.message,
            code: error?.code
        });
    }

    // 測試 2: Session 表查詢
    try {
        console.log("【DB Test】測試 2: Session 表查詢");
        const startTime = Date.now();
        const sessionCount = await prisma.session.count();
        const queryTime = Date.now() - startTime;

        results.tests.push({
            name: "Session 表查詢",
            status: "success",
            duration: queryTime,
            result: sessionCount,
            message: `查詢到 ${sessionCount} 個 session 記錄`
        });
        console.log("【DB Test】Session 查詢成功，記錄數:", sessionCount, "耗時:", queryTime, "ms");
    } catch (error: any) {
        console.error("【DB Test】Session 查詢失敗:", error);
        results.tests.push({
            name: "Session 表查詢",
            status: "error",
            error: error?.message,
            code: error?.code,
            meta: error?.meta
        });
    }

    // 測試 3: 原始 SQL 查詢
    try {
        console.log("【DB Test】測試 3: 原始 SQL 查詢");
        const startTime = Date.now();
        const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`;
        const queryTime = Date.now() - startTime;

        results.tests.push({
            name: "原始 SQL 查詢",
            status: "success",
            duration: queryTime,
            result: result,
            message: "原始 SQL 查詢成功"
        });
        console.log("【DB Test】原始 SQL 查詢成功，耗時:", queryTime, "ms");
    } catch (error: any) {
        console.error("【DB Test】原始 SQL 查詢失敗:", error);
        results.tests.push({
            name: "原始 SQL 查詢",
            status: "error",
            error: error?.message,
            code: error?.code
        });
    }

    // 測試 4: 連接池狀態
    try {
        console.log("【DB Test】測試 4: 連接池狀態");
        const startTime = Date.now();

        // 嘗試多個並發查詢來測試連接池
        const promises = Array.from({ length: 3 }, (_, i) =>
            prisma.$queryRaw`SELECT ${i} as test_id, NOW() as timestamp`
        );

        const results2 = await Promise.all(promises);
        const poolTime = Date.now() - startTime;

        results.tests.push({
            name: "連接池測試",
            status: "success",
            duration: poolTime,
            result: results2.length,
            message: `成功執行 ${results2.length} 個並發查詢`
        });
        console.log("【DB Test】連接池測試成功，耗時:", poolTime, "ms");
    } catch (error: any) {
        console.error("【DB Test】連接池測試失敗:", error);
        results.tests.push({
            name: "連接池測試",
            status: "error",
            error: error?.message,
            code: error?.code
        });
    }

    // 環境資訊
    const environmentInfo = {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? '已設定' : '未設定',
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
    };

    console.log("=== 資料庫連接測試完成 ===");

    return json({
        ...results,
        environmentInfo,
        summary: {
            total: results.tests.length,
            success: results.tests.filter(t => t.status === 'success').length,
            failed: results.tests.filter(t => t.status === 'error').length
        }
    });
};

export default function DatabaseTest() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>資料庫連接測試</h1>

            <div style={{
                padding: "10px",
                backgroundColor: data.summary.failed === 0 ? "#d4edda" : "#f8d7da",
                border: "1px solid",
                borderColor: data.summary.failed === 0 ? "#c3e6cb" : "#f5c6cb",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <h2>測試摘要</h2>
                <p><strong>總測試數:</strong> {data.summary.total}</p>
                <p><strong>成功:</strong> {data.summary.success} ✅</p>
                <p><strong>失敗:</strong> {data.summary.failed} ❌</p>
                <p><strong>時間戳:</strong> {data.timestamp}</p>
            </div>

            <h2>詳細測試結果</h2>
            {data.tests.map((test, index) => (
                <div key={index} style={{
                    padding: "15px",
                    backgroundColor: test.status === 'success' ? "#d4edda" : "#f8d7da",
                    border: "1px solid",
                    borderColor: test.status === 'success' ? "#c3e6cb" : "#f5c6cb",
                    borderRadius: "4px",
                    marginBottom: "10px"
                }}>
                    <h3>{test.name}</h3>
                    <p><strong>狀態:</strong> {test.status === 'success' ? "✅ 成功" : "❌ 失敗"}</p>
                    {test.duration && <p><strong>耗時:</strong> {test.duration}ms</p>}
                    {test.message && <p><strong>訊息:</strong> {test.message}</p>}
                    {test.result !== undefined && <p><strong>結果:</strong> {JSON.stringify(test.result)}</p>}
                    {test.error && (
                        <div>
                            <p><strong>錯誤:</strong> {test.error}</p>
                            {test.code && <p><strong>錯誤代碼:</strong> {test.code}</p>}
                            {test.meta && <p><strong>錯誤詳情:</strong> {JSON.stringify(test.meta)}</p>}
                        </div>
                    )}
                </div>
            ))}

            <h2>環境資訊</h2>
            <div style={{
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <p><strong>Node 環境:</strong> {data.environmentInfo?.NODE_ENV}</p>
                <p><strong>資料庫 URL:</strong> {data.environmentInfo?.DATABASE_URL}</p>
                <p><strong>平台:</strong> {data.environmentInfo?.platform}</p>
                <p><strong>Node 版本:</strong> {data.environmentInfo?.nodeVersion}</p>
                <p><strong>運行時間:</strong> {Math.round(data.environmentInfo?.uptime || 0)}秒</p>

                <h3>記憶體使用</h3>
                <p><strong>RSS:</strong> {Math.round((data.environmentInfo?.memoryUsage?.rss || 0) / 1024 / 1024)}MB</p>
                <p><strong>Heap Used:</strong> {Math.round((data.environmentInfo?.memoryUsage?.heapUsed || 0) / 1024 / 1024)}MB</p>
                <p><strong>Heap Total:</strong> {Math.round((data.environmentInfo?.memoryUsage?.heapTotal || 0) / 1024 / 1024)}MB</p>
            </div>

            <h2>連接池超時問題解決方案</h2>
            <div style={{
                padding: "15px",
                backgroundColor: "#fff3cd",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                <h3>立即解決方案</h3>
                <ul>
                    <li><strong>重新部署:</strong> 重新部署應用程式以重置連接池</li>
                    <li><strong>檢查資料庫:</strong> 確認資料庫服務正常運行</li>
                    <li><strong>網路檢查:</strong> 確認網路連接穩定</li>
                </ul>

                <h3>長期解決方案</h3>
                <ul>
                    <li><strong>連接池優化:</strong> 調整 Prisma 連接池設定</li>
                    <li><strong>資料庫升級:</strong> 考慮升級資料庫資源</li>
                    <li><strong>監控設定:</strong> 設定資料庫連接監控</li>
                </ul>

                <h3>Vercel 特定建議</h3>
                <ul>
                    <li>使用 Vercel Postgres 或 Neon 等無伺服器資料庫</li>
                    <li>設定適當的連接池大小</li>
                    <li>啟用連接池監控</li>
                </ul>
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
                    重新測試
                </button>
                <a
                    href="/db-health"
                    style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        textDecoration: "none",
                        padding: "8px 16px",
                        borderRadius: "4px"
                    }}
                >
                    詳細健康檢查
                </a>
            </div>
        </div>
    );
} 