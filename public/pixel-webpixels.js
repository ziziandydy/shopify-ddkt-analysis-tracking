(function () {
    // 獲取追蹤 ID
    function getQueryParam(name) {
        try {
            var url = new URL(window.location.href);
            return url.searchParams.get(name);
        } catch (e) {
            // fallback for older browsers
            var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
            return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }

    var tid = getQueryParam('tid') || 'spfy-test';

    // 初始化追蹤器
    window._ghq = window._ghq || [];
    var u = 'https://violet.ghtinc.com/tracking/groundhogSensitiveCookie';
    var g = document.createElement('script');
    g.type = 'text/javascript';
    g.async = true;
    g.src = u;
    document.getElementsByTagName('head')[0].appendChild(g);

    // 原有的追蹤邏輯
    (function (t) {
        var u = 'https://violet.ghtinc.com/tracking',
            j = document.createElement('script');
        window._ghq.push(['setTrackerUrl', u + '/track/v2']);
        window._ghq.push(['setTrackerId', t]);
        window._ghq.push(['trackPageView']);
        j.type = 'text/javascript';
        j.async = true;
        j.src = u + '/groundhog-tracker.js';
        document.getElementsByTagName('head')[0].appendChild(j);
    })(tid);

    // Shopify Web Pixels API 支援
    if (typeof window.Shopify !== 'undefined' && window.Shopify.checkout) {
        console.log('【Pixel】檢測到 Shopify 環境，啟用 Web Pixels API 支援');

        // 監聽 Shopify 事件
        document.addEventListener('DOMContentLoaded', function () {
            // 頁面瀏覽事件
            if (window._ghq && window._ghq.push) {
                window._ghq.push(['trackEvent', 'shopify_page_view', {
                    page_type: window.Shopify.checkout.page || 'unknown',
                    tracking_id: tid,
                    timestamp: new Date().toISOString()
                }]);
            }
        });

        // 購物車事件監聽
        if (typeof window.ShopifyAnalytics !== 'undefined') {
            window.ShopifyAnalytics.lib.page(function (pageData) {
                if (window._ghq && window._ghq.push) {
                    window._ghq.push(['trackEvent', 'shopify_page_data', {
                        page_type: pageData.page_type,
                        resource_type: pageData.resource_type,
                        resource_id: pageData.resource_id,
                        tracking_id: tid,
                        timestamp: new Date().toISOString()
                    }]);
                }
            });
        }

        // 購物車變更事件
        if (typeof window.Shopify !== 'undefined' && window.Shopify.onCartUpdate) {
            window.Shopify.onCartUpdate = function (cart) {
                if (window._ghq && window._ghq.push) {
                    window._ghq.push(['trackEvent', 'shopify_cart_update', {
                        cart_token: cart.token,
                        item_count: cart.item_count,
                        total_price: cart.total_price,
                        tracking_id: tid,
                        timestamp: new Date().toISOString()
                    }]);
                }
            };
        }

        // 結帳事件
        if (window.Shopify.checkout && window.Shopify.checkout.order_id) {
            if (window._ghq && window._ghq.push) {
                window._ghq.push(['trackEvent', 'shopify_order_complete', {
                    order_id: window.Shopify.checkout.order_id,
                    total_price: window.Shopify.checkout.total_price,
                    currency: window.Shopify.checkout.currency,
                    tracking_id: tid,
                    timestamp: new Date().toISOString()
                }]);
            }
        }
    }

    // 產品瀏覽事件
    if (typeof window.ShopifyAnalytics !== 'undefined' && window.ShopifyAnalytics.meta) {
        var productData = window.ShopifyAnalytics.meta.product;
        if (productData) {
            if (window._ghq && window._ghq.push) {
                window._ghq.push(['trackEvent', 'shopify_product_view', {
                    product_id: productData.id,
                    product_title: productData.title,
                    product_price: productData.price,
                    tracking_id: tid,
                    timestamp: new Date().toISOString()
                }]);
            }
        }
    }

    // 搜尋事件
    if (typeof window.ShopifyAnalytics !== 'undefined' && window.ShopifyAnalytics.meta) {
        var searchData = window.ShopifyAnalytics.meta.search;
        if (searchData) {
            if (window._ghq && window._ghq.push) {
                window._ghq.push(['trackEvent', 'shopify_search', {
                    search_term: searchData.term,
                    results_count: searchData.results_count,
                    tracking_id: tid,
                    timestamp: new Date().toISOString()
                }]);
            }
        }
    }

    // 自定義事件追蹤函數
    window.trackShopifyEvent = function (eventName, eventData) {
        if (window._ghq && window._ghq.push) {
            var enhancedData = {
                ...eventData,
                tracking_id: tid,
                timestamp: new Date().toISOString(),
                platform: 'shopify'
            };

            window._ghq.push(['trackEvent', eventName, enhancedData]);
            console.log('【Pixel】追蹤事件:', eventName, enhancedData);
        }
    };

    console.log('【Pixel】Web Pixels API 支援已啟用，追蹤 ID:', tid);
})(); 