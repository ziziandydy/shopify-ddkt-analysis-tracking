// Cookie 記錄工具
export interface CookieInfo {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
}

export interface CookieAnalysis {
    totalCookies: number;
    sessionCookies: number;
    persistentCookies: number;
    secureCookies: number;
    httpOnlyCookies: number;
    shopifyCookies: number;
    customCookies: number;
    cookieDetails: CookieInfo[];
    missingCookies: string[];
    recommendations: string[];
}

export function parseCookieHeader(cookieHeader: string | null): CookieInfo[] {
    if (!cookieHeader) return [];

    const cookies: CookieInfo[] = [];
    const cookiePairs = cookieHeader.split(';');

    for (const pair of cookiePairs) {
        const trimmedPair = pair.trim();
        if (!trimmedPair) continue;

        const [nameValue, ...attributes] = trimmedPair.split(';');
        const [name, value] = nameValue.split('=');

        if (!name || !value) continue;

        const cookie: CookieInfo = {
            name: name.trim(),
            value: value.trim()
        };

        // 解析其他屬性
        for (const attr of attributes) {
            const [attrName, attrValue] = attr.split('=');
            const trimmedAttrName = attrName.trim().toLowerCase();
            const trimmedAttrValue = attrValue?.trim();

            switch (trimmedAttrName) {
                case 'domain':
                    cookie.domain = trimmedAttrValue;
                    break;
                case 'path':
                    cookie.path = trimmedAttrValue;
                    break;
                case 'expires':
                    cookie.expires = trimmedAttrValue;
                    break;
                case 'max-age':
                    cookie.maxAge = parseInt(trimmedAttrValue || '0');
                    break;
                case 'secure':
                    cookie.secure = true;
                    break;
                case 'httponly':
                    cookie.httpOnly = true;
                    break;
                case 'samesite':
                    cookie.sameSite = trimmedAttrValue;
                    break;
            }
        }

        cookies.push(cookie);
    }

    return cookies;
}

export function analyzeCookies(cookies: CookieInfo[]): CookieAnalysis {
    const analysis: CookieAnalysis = {
        totalCookies: cookies.length,
        sessionCookies: 0,
        persistentCookies: 0,
        secureCookies: 0,
        httpOnlyCookies: 0,
        shopifyCookies: 0,
        customCookies: 0,
        cookieDetails: cookies,
        missingCookies: [],
        recommendations: []
    };

    const shopifyCookieNames = [
        'shopify_session',
        'shopify_app_session',
        'shopify_app_redirect',
        'shopify_app_state',
        'shopify_app_oauth_state',
        'shopify_app_shop',
        'shopify_app_scope',
        'shopify_app_token',
        'shopify_app_user',
        'shopify_app_admin',
        'shopify_app_embedded',
        'shopify_app_theme',
        'shopify_app_webhook',
        'shopify_app_webhook_hmac',
        'shopify_app_webhook_topic',
        'shopify_app_webhook_domain',
        'shopify_app_webhook_api_version',
        'shopify_app_webhook_address',
        'shopify_app_webhook_format',
        'shopify_app_webhook_created_at',
        'shopify_app_webhook_updated_at',
        'shopify_app_webhook_deleted_at',
        'shopify_app_webhook_created_by',
        'shopify_app_webhook_updated_by',
        'shopify_app_webhook_deleted_by',
        'shopify_app_webhook_created_from',
        'shopify_app_webhook_updated_from',
        'shopify_app_webhook_deleted_from',
        'shopify_app_webhook_created_ip',
        'shopify_app_webhook_updated_ip',
        'shopify_app_webhook_deleted_ip',
        'shopify_app_webhook_created_user_agent',
        'shopify_app_webhook_updated_user_agent',
        'shopify_app_webhook_deleted_user_agent',
        'shopify_app_webhook_created_referer',
        'shopify_app_webhook_updated_referer',
        'shopify_app_webhook_deleted_referer',
        'shopify_app_webhook_created_accept_language',
        'shopify_app_webhook_updated_accept_language',
        'shopify_app_webhook_deleted_accept_language',
        'shopify_app_webhook_created_accept_encoding',
        'shopify_app_webhook_updated_accept_encoding',
        'shopify_app_webhook_deleted_accept_encoding',
        'shopify_app_webhook_created_connection',
        'shopify_app_webhook_updated_connection',
        'shopify_app_webhook_deleted_connection',
        'shopify_app_webhook_created_upgrade_insecure_requests',
        'shopify_app_webhook_updated_upgrade_insecure_requests',
        'shopify_app_webhook_deleted_upgrade_insecure_requests',
        'shopify_app_webhook_created_sec_fetch_dest',
        'shopify_app_webhook_updated_sec_fetch_dest',
        'shopify_app_webhook_deleted_sec_fetch_dest',
        'shopify_app_webhook_created_sec_fetch_mode',
        'shopify_app_webhook_updated_sec_fetch_mode',
        'shopify_app_webhook_deleted_sec_fetch_mode',
        'shopify_app_webhook_created_sec_fetch_site',
        'shopify_app_webhook_updated_sec_fetch_site',
        'shopify_app_webhook_deleted_sec_fetch_site',
        'shopify_app_webhook_created_sec_fetch_user',
        'shopify_app_webhook_updated_sec_fetch_user',
        'shopify_app_webhook_deleted_sec_fetch_user',
        'shopify_app_webhook_created_sec_ch_ua',
        'shopify_app_webhook_updated_sec_ch_ua',
        'shopify_app_webhook_deleted_sec_ch_ua',
        'shopify_app_webhook_created_sec_ch_ua_mobile',
        'shopify_app_webhook_updated_sec_ch_ua_mobile',
        'shopify_app_webhook_deleted_sec_ch_ua_mobile',
        'shopify_app_webhook_created_sec_ch_ua_platform',
        'shopify_app_webhook_updated_sec_ch_ua_platform',
        'shopify_app_webhook_deleted_sec_ch_ua_platform',
        'shopify_app_webhook_created_sec_ch_ua_platform_version',
        'shopify_app_webhook_updated_sec_ch_ua_platform_version',
        'shopify_app_webhook_deleted_sec_ch_ua_platform_version',
        'shopify_app_webhook_created_sec_ch_ua_model',
        'shopify_app_webhook_updated_sec_ch_ua_model',
        'shopify_app_webhook_deleted_sec_ch_ua_model',
        'shopify_app_webhook_created_sec_ch_ua_brand',
        'shopify_app_webhook_updated_sec_ch_ua_brand',
        'shopify_app_webhook_deleted_sec_ch_ua_brand',
        'shopify_app_webhook_created_sec_ch_ua_full_version',
        'shopify_app_webhook_updated_sec_ch_ua_full_version',
        'shopify_app_webhook_deleted_sec_ch_ua_full_version',
        'shopify_app_webhook_created_sec_ch_ua_full_version_list',
        'shopify_app_webhook_updated_sec_ch_ua_full_version_list',
        'shopify_app_webhook_deleted_sec_ch_ua_full_version_list',
        'shopify_app_webhook_created_sec_ch_ua_wow64',
        'shopify_app_webhook_updated_sec_ch_ua_wow64',
        'shopify_app_webhook_deleted_sec_ch_ua_wow64',
        'shopify_app_webhook_created_sec_ch_ua_arch',
        'shopify_app_webhook_updated_sec_ch_ua_arch',
        'shopify_app_webhook_deleted_sec_ch_ua_arch',
        'shopify_app_webhook_created_sec_ch_ua_bits',
        'shopify_app_webhook_updated_sec_ch_ua_bits',
        'shopify_app_webhook_deleted_sec_ch_ua_bits',
        'shopify_app_webhook_created_sec_ch_ua_full_version_list',
        'shopify_app_webhook_updated_sec_ch_ua_full_version_list',
        'shopify_app_webhook_deleted_sec_ch_ua_full_version_list',
        'shopify_app_webhook_created_sec_ch_ua_wow64',
        'shopify_app_webhook_updated_sec_ch_ua_wow64',
        'shopify_app_webhook_deleted_sec_ch_ua_wow64',
        'shopify_app_webhook_created_sec_ch_ua_arch',
        'shopify_app_webhook_updated_sec_ch_ua_arch',
        'shopify_app_webhook_deleted_sec_ch_ua_arch',
        'shopify_app_webhook_created_sec_ch_ua_bits',
        'shopify_app_webhook_updated_sec_ch_ua_bits',
        'shopify_app_webhook_deleted_sec_ch_ua_bits'
    ];

    const foundCookieNames = new Set<string>();

    for (const cookie of cookies) {
        foundCookieNames.add(cookie.name);

        // 統計各種類型的 Cookie
        if (cookie.expires || cookie.maxAge) {
            analysis.persistentCookies++;
        } else {
            analysis.sessionCookies++;
        }

        if (cookie.secure) {
            analysis.secureCookies++;
        }

        if (cookie.httpOnly) {
            analysis.httpOnlyCookies++;
        }

        if (shopifyCookieNames.includes(cookie.name.toLowerCase())) {
            analysis.shopifyCookies++;
        } else {
            analysis.customCookies++;
        }
    }

    // 檢查缺少的重要 Cookie
    const importantCookies = [
        'shopify_session',
        'shopify_app_session',
        'shopify_app_shop'
    ];

    for (const importantCookie of importantCookies) {
        if (!foundCookieNames.has(importantCookie)) {
            analysis.missingCookies.push(importantCookie);
        }
    }

    // 生成建議
    if (analysis.missingCookies.length > 0) {
        analysis.recommendations.push(`缺少重要的 Cookie: ${analysis.missingCookies.join(', ')}`);
    }

    if (analysis.shopifyCookies === 0) {
        analysis.recommendations.push('未檢測到 Shopify 相關 Cookie，可能需要重新認證');
    }

    if (analysis.secureCookies === 0) {
        analysis.recommendations.push('建議啟用 Secure Cookie 以提高安全性');
    }

    if (analysis.httpOnlyCookies === 0) {
        analysis.recommendations.push('建議啟用 HttpOnly Cookie 以防止 XSS 攻擊');
    }

    return analysis;
}

export function logCookieInfo(context: string, request: Request) {
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookieHeader(cookieHeader);
    const analysis = analyzeCookies(cookies);

    console.log(`【${context}】Cookie 詳細分析:`);
    console.log(`【${context}】總 Cookie 數量:`, analysis.totalCookies);
    console.log(`【${context}】Session Cookie:`, analysis.sessionCookies);
    console.log(`【${context}】Persistent Cookie:`, analysis.persistentCookies);
    console.log(`【${context}】Secure Cookie:`, analysis.secureCookies);
    console.log(`【${context}】HttpOnly Cookie:`, analysis.httpOnlyCookies);
    console.log(`【${context}】Shopify Cookie:`, analysis.shopifyCookies);
    console.log(`【${context}】Custom Cookie:`, analysis.customCookies);

    if (analysis.cookieDetails.length > 0) {
        console.log(`【${context}】Cookie 詳情:`);
        analysis.cookieDetails.forEach((cookie, index) => {
            console.log(`【${context}】  ${index + 1}. ${cookie.name}:`, {
                value: cookie.value.length > 50 ? cookie.value.substring(0, 50) + '...' : cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires,
                maxAge: cookie.maxAge,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite
            });
        });
    }

    if (analysis.missingCookies.length > 0) {
        console.log(`【${context}】缺少的 Cookie:`, analysis.missingCookies);
    }

    if (analysis.recommendations.length > 0) {
        console.log(`【${context}】建議:`, analysis.recommendations);
    }

    return analysis;
}

export function logCookieHeaders(context: string, request: Request) {
    console.log(`【${context}】所有 Cookie 相關標頭:`);

    const cookieHeaders = [
        'cookie',
        'set-cookie',
        'cookie2',
        'set-cookie2'
    ];

    for (const headerName of cookieHeaders) {
        const headerValue = request.headers.get(headerName);
        if (headerValue) {
            console.log(`【${context}】${headerName}:`, headerValue);
        } else {
            console.log(`【${context}】${headerName}: 未設定`);
        }
    }
} 