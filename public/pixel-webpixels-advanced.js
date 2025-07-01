(function () {
    'use strict';

    // 配置
    var CONFIG = {
        trackingId: null,
        debug: false,
        endpoint: 'https://violet.ghtinc.com/tracking',
        events: {
            page_view: true,
            product_view: true,
            cart_update: true,
            checkout_start: true,
            checkout_complete: true,
            search: true,
            collection_view: true
        }
    };

    // 工具函數
    function getQueryParam(name) {
        try {
            var url = new URL(window.location.href);
            return url.searchParams.get(name);
        } catch (e) {
            var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
            return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }

    function log(message, data) {
        if (CONFIG.debug) {
            console.log('【Pixel】' + message, data || '');
        }
    }

    function getShopifyData() {
        var data = {
            shop: window.Shopify?.shop || null,
            currency: window.Shopify?.currency?.active || 'USD',
            customer: null,
            cart: null,
            checkout: null
        };

        // 客戶資訊
        if (window.Shopify?.customer) {
            data.customer = {
                id: window.Shopify.customer.id,
                email: window.Shopify.customer.email,
                first_name: window.Shopify.customer.first_name,
                last_name: window.Shopify.customer.last_name
            };
        }

        // 購物車資訊
        if (window.ShopifyAnalytics?.meta?.cart) {
            data.cart = window.ShopifyAnalytics.meta.cart;
        }

        // 結帳資訊
        if (window.Shopify?.checkout) {
            data.checkout = {
                token: window.Shopify.checkout.token,
                order_id: window.Shopify.checkout.order_id,
                total_price: window.Shopify.checkout.total_price,
                currency: window.Shopify.checkout.currency
            };
        }

        return data;
    }

    // 事件追蹤器
    var EventTracker = {
        init: function (trackingId) {
            CONFIG.trackingId = trackingId || getQueryParam('tid') || 'spfy-test';
            this.setupTracking();
            this.bindEvents();
            log('初始化完成，追蹤 ID: ' + CONFIG.trackingId);
        },

        setupTracking: function () {
            // 初始化原有的追蹤器
            window._ghq = window._ghq || [];
            var u = CONFIG.endpoint + '/groundhogSensitiveCookie';
            var g = document.createElement('script');
            g.type = 'text/javascript';
            g.async = true;
            g.src = u;
            document.getElementsByTagName('head')[0].appendChild(g);

            var j = document.createElement('script');
            window._ghq.push(['setTrackerUrl', CONFIG.endpoint + '/track/v2']);
            window._ghq.push(['setTrackerId', CONFIG.trackingId]);
            window._ghq.push(['trackPageView']);
            j.type = 'text/javascript';
            j.async = true;
            j.src = CONFIG.endpoint + '/groundhog-tracker.js';
            document.getElementsByTagName('head')[0].appendChild(j);
        },

        bindEvents: function () {
            var self = this;

            // DOM 載入完成後綁定事件
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    self.bindShopifyEvents();
                });
            } else {
                this.bindShopifyEvents();
            }
        },

        bindShopifyEvents: function () {
            var self = this;

            // 頁面瀏覽事件
            if (CONFIG.events.page_view) {
                this.trackPageView();
            }

            // Shopify Analytics 事件
            if (typeof window.ShopifyAnalytics !== 'undefined') {
                // 頁面數據
                if (window.ShopifyAnalytics.lib && window.ShopifyAnalytics.lib.page) {
                    window.ShopifyAnalytics.lib.page(function (pageData) {
                        self.trackShopifyEvent('page_data', {
                            page_type: pageData.page_type,
                            resource_type: pageData.resource_type,
                            resource_id: pageData.resource_id
                        });
                    });
                }

                // 產品瀏覽
                if (CONFIG.events.product_view && window.ShopifyAnalytics.meta?.product) {
                    this.trackProductView(window.ShopifyAnalytics.meta.product);
                }

                // 分類瀏覽
                if (CONFIG.events.collection_view && window.ShopifyAnalytics.meta?.collection) {
                    this.trackCollectionView(window.ShopifyAnalytics.meta.collection);
                }

                // 搜尋
                if (CONFIG.events.search && window.ShopifyAnalytics.meta?.search) {
                    this.trackSearch(window.ShopifyAnalytics.meta.search);
                }
            }

            // 購物車事件
            if (CONFIG.events.cart_update) {
                this.bindCartEvents();
            }

            // 結帳事件
            if (CONFIG.events.checkout_start || CONFIG.events.checkout_complete) {
                this.bindCheckoutEvents();
            }
        },

        trackPageView: function () {
            var pageData = {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                shopify_data: getShopifyData()
            };

            this.trackShopifyEvent('page_view', pageData);
        },

        trackProductView: function (product) {
            var productData = {
                product_id: product.id,
                product_title: product.title,
                product_price: product.price,
                product_vendor: product.vendor,
                product_type: product.type,
                product_tags: product.tags,
                shopify_data: getShopifyData()
            };

            this.trackShopifyEvent('product_view', productData);
        },

        trackCollectionView: function (collection) {
            var collectionData = {
                collection_id: collection.id,
                collection_title: collection.title,
                collection_handle: collection.handle,
                products_count: collection.products_count,
                shopify_data: getShopifyData()
            };

            this.trackShopifyEvent('collection_view', collectionData);
        },

        trackSearch: function (search) {
            var searchData = {
                search_term: search.term,
                results_count: search.results_count,
                shopify_data: getShopifyData()
            };

            this.trackShopifyEvent('search', searchData);
        },

        bindCartEvents: function () {
            var self = this;

            // 監聽購物車變更
            if (typeof window.Shopify !== 'undefined' && window.Shopify.onCartUpdate) {
                window.Shopify.onCartUpdate = function (cart) {
                    self.trackShopifyEvent('cart_update', {
                        cart_token: cart.token,
                        item_count: cart.item_count,
                        total_price: cart.total_price,
                        items: cart.items,
                        shopify_data: getShopifyData()
                    });
                };
            }

            // 監聽 AJAX 購物車變更
            document.addEventListener('cart:updated', function (event) {
                if (event.detail && event.detail.cart) {
                    self.trackShopifyEvent('cart_ajax_update', {
                        cart_data: event.detail.cart,
                        shopify_data: getShopifyData()
                    });
                }
            });
        },

        bindCheckoutEvents: function () {
            var self = this;

            // 結帳開始
            if (CONFIG.events.checkout_start && window.Shopify?.checkout?.token) {
                this.trackShopifyEvent('checkout_start', {
                    checkout_token: window.Shopify.checkout.token,
                    shopify_data: getShopifyData()
                });
            }

            // 結帳完成
            if (CONFIG.events.checkout_complete && window.Shopify?.checkout?.order_id) {
                this.trackShopifyEvent('checkout_complete', {
                    order_id: window.Shopify.checkout.order_id,
                    total_price: window.Shopify.checkout.total_price,
                    currency: window.Shopify.checkout.currency,
                    shopify_data: getShopifyData()
                });
            }
        },

        trackShopifyEvent: function (eventName, eventData) {
            if (!window._ghq || !window._ghq.push) {
                log('追蹤器未初始化，跳過事件: ' + eventName);
                return;
            }

            var enhancedData = {
                ...eventData,
                tracking_id: CONFIG.trackingId,
                timestamp: new Date().toISOString(),
                platform: 'shopify',
                event_name: eventName,
                user_agent: navigator.userAgent,
                language: navigator.language
            };

            window._ghq.push(['trackEvent', 'shopify_' + eventName, enhancedData]);
            log('追蹤事件: ' + eventName, enhancedData);
        },

        // 自定義事件追蹤
        trackCustomEvent: function (eventName, eventData) {
            this.trackShopifyEvent('custom_' + eventName, eventData);
        },

        // 啟用/禁用調試模式
        setDebug: function (enabled) {
            CONFIG.debug = enabled;
            log('調試模式: ' + (enabled ? '啟用' : '禁用'));
        }
    };

    // 全域函數
    window.ShopifyPixelTracker = EventTracker;
    window.trackShopifyEvent = function (eventName, eventData) {
        EventTracker.trackCustomEvent(eventName, eventData);
    };

    // 自動初始化
    EventTracker.init();

    log('Web Pixels API 進階版本已載入');
})(); 