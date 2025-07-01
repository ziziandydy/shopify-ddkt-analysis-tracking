// OAuth 流程監控工具
export interface OAuthStep {
    step: string;
    timestamp: string;
    success: boolean;
    details?: any;
    error?: any;
}

class OAuthMonitor {
    private steps: OAuthStep[] = [];
    private sessionId: string;

    constructor(sessionId?: string) {
        this.sessionId = sessionId || `session-${Date.now()}`;
        console.log(`【OAuth Monitor】開始監控 OAuth 流程 - Session ID: ${this.sessionId}`);
    }

    logStep(step: string, success: boolean, details?: any, error?: any) {
        const stepInfo: OAuthStep = {
            step,
            timestamp: new Date().toISOString(),
            success,
            details,
            error
        };

        this.steps.push(stepInfo);

        if (success) {
            console.log(`【OAuth Monitor】✅ ${step} - 成功`, details);
        } else {
            console.error(`【OAuth Monitor】❌ ${step} - 失敗`, error);
            if (details) {
                console.error(`【OAuth Monitor】❌ ${step} - 詳細資訊`, details);
            }
        }
    }

    logEnvironmentCheck() {
        const envCheck = {
            SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
            SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
            SHOPIFY_APP_URL: !!process.env.SHOPIFY_APP_URL,
            SCOPES: !!process.env.SCOPES,
            NODE_ENV: process.env.NODE_ENV
        };

        const allSet = Object.values(envCheck).every(Boolean);
        this.logStep("環境變數檢查", allSet, envCheck);
    }

    logRequestInfo(request: Request) {
        const requestInfo = {
            url: request.url,
            method: request.method,
            userAgent: request.headers.get("user-agent"),
            referer: request.headers.get("referer"),
            host: request.headers.get("host"),
            hasCookie: !!request.headers.get("cookie")
        };

        this.logStep("請求資訊記錄", true, requestInfo);
    }

    logAuthenticationStart() {
        this.logStep("認證流程開始", true);
    }

    logAuthenticationSuccess(session: any) {
        const sessionInfo = {
            id: session?.id,
            shop: session?.shop,
            isOnline: session?.isOnline,
            scope: session?.scope,
            hasAccessToken: !!session?.accessToken,
            expires: session?.expires
        };

        this.logStep("認證成功", true, sessionInfo);
    }

    logAuthenticationFailure(error: any) {
        this.logStep("認證失敗", false, null, {
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText
        });
    }

    logAfterAuthStart(shop: string) {
        this.logStep("afterAuth 回調開始", true, { shop });
    }

    logAfterAuthSuccess() {
        this.logStep("afterAuth 回調完成", true);
    }

    logAfterAuthFailure(error: any) {
        this.logStep("afterAuth 回調失敗", false, null, {
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText
        });
    }

    logScriptTagOperation(operation: string, success: boolean, details?: any, error?: any) {
        this.logStep(`ScriptTag ${operation}`, success, details, error);
    }

    logRedirect(direction: string, url: string) {
        this.logStep(`重定向 - ${direction}`, true, { url });
    }

    getSummary() {
        const totalSteps = this.steps.length;
        const successfulSteps = this.steps.filter(step => step.success).length;
        const failedSteps = this.steps.filter(step => !step.success);

        console.log(`【OAuth Monitor】流程總結 - Session ID: ${this.sessionId}`);
        console.log(`【OAuth Monitor】總步驟數: ${totalSteps}`);
        console.log(`【OAuth Monitor】成功步驟: ${successfulSteps}`);
        console.log(`【OAuth Monitor】失敗步驟: ${failedSteps.length}`);

        if (failedSteps.length > 0) {
            console.error(`【OAuth Monitor】失敗的步驟:`);
            failedSteps.forEach(step => {
                console.error(`  - ${step.step}: ${step.error?.message || '未知錯誤'}`);
            });
        }

        return {
            sessionId: this.sessionId,
            totalSteps,
            successfulSteps,
            failedSteps: failedSteps.length,
            steps: this.steps
        };
    }

    getSteps() {
        return this.steps;
    }
}

// 全域 OAuth 監控實例
let globalOAuthMonitor: OAuthMonitor | null = null;

export function createOAuthMonitor(sessionId?: string): OAuthMonitor {
    globalOAuthMonitor = new OAuthMonitor(sessionId);
    return globalOAuthMonitor;
}

export function getOAuthMonitor(): OAuthMonitor | null {
    return globalOAuthMonitor;
}

export function logOAuthStep(step: string, success: boolean, details?: any, error?: any) {
    if (globalOAuthMonitor) {
        globalOAuthMonitor.logStep(step, success, details, error);
    } else {
        console.log(`【OAuth】${step} - ${success ? '成功' : '失敗'}`, details || error);
    }
} 