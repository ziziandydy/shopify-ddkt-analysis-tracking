// 錯誤日誌工具
export interface ErrorDetails {
    message?: string;
    stack?: string;
    name?: string;
    code?: string | number;
    status?: number;
    statusText?: string;
    body?: any;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
}

export function logError(context: string, error: any, additionalInfo?: Record<string, any>) {
    const errorDetails: ErrorDetails = {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name,
        code: (error as any)?.code,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        body: (error as any)?.body,
        url: (error as any)?.url,
        method: (error as any)?.method,
        headers: (error as any)?.headers ? Object.fromEntries((error as any).headers.entries()) : undefined
    };

    console.error(`【${context}】錯誤發生:`, error);
    console.error(`【${context}】錯誤詳情:`, errorDetails);

    if (additionalInfo) {
        console.error(`【${context}】額外資訊:`, additionalInfo);
    }

    // 特殊錯誤類型處理
    if (errorDetails.status) {
        console.error(`【${context}】HTTP 狀態: ${errorDetails.status} ${errorDetails.statusText}`);

        if (errorDetails.status === 401) {
            console.error(`【${context}】認證失敗 - 請檢查 API 金鑰和密鑰`);
        } else if (errorDetails.status === 403) {
            console.error(`【${context}】權限不足 - 請檢查應用程式權限`);
        } else if (errorDetails.status === 404) {
            console.error(`【${context}】資源未找到 - 請檢查 URL 和路由`);
        } else if (errorDetails.status >= 500) {
            console.error(`【${context}】伺服器錯誤 - 請檢查伺服器狀態`);
        }
    }

    // 重定向錯誤處理
    if (errorDetails.status && errorDetails.status >= 300 && errorDetails.status < 400) {
        console.log(`【${context}】檢測到重定向:`, {
            status: errorDetails.status,
            location: errorDetails.headers?.location,
            url: errorDetails.url
        });
    }

    return errorDetails;
}

export function logRequest(context: string, request: Request) {
    console.log(`【${context}】請求資訊:`, {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        host: request.headers.get("host"),
        cookie: request.headers.get("cookie") ? "已設定" : "未設定"
    });
}

export function logEnvironment(context: string) {
    console.log(`【${context}】環境變數檢查:`, {
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "已設定" : "未設定",
        SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "已設定" : "未設定",
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "未設定",
        SCOPES: process.env.SCOPES || "未設定",
        NODE_ENV: process.env.NODE_ENV || "未設定",
        SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN || "未設定"
    });
}

export function validateEnvironment() {
    const requiredEnvVars = {
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
        SCOPES: process.env.SCOPES,
    };

    const missingEnvVars = Object.entries(requiredEnvVars)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missingEnvVars.length > 0) {
        const error = new Error(`缺少必要的環境變數: ${missingEnvVars.join(", ")}`);
        logError("Environment", error);
        throw error;
    }

    console.log("【Environment】所有必要的環境變數都已設定");
} 