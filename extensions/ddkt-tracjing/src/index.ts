import { register } from "@shopify/web-pixels-extension";

register(({ analytics }) => {
  // Page view
  analytics.subscribe('page_viewed', (event) => {
    sendToServer('page_viewed', event);
  });

  // Product view
  analytics.subscribe('product_viewed', (event) => {
    sendToServer('product_viewed', event);
  });

  // Cart updated
  analytics.subscribe('cart_updated', (event) => {
    sendToServer('cart_updated', event);
  });

  // Checkout started
  analytics.subscribe('checkout_started', (event) => {
    sendToServer('checkout_started', event);
  });

  // Checkout completed
  analytics.subscribe('checkout_completed', (event) => {
    sendToServer('checkout_completed', event);
  });

  // 你可以根據需要訂閱更多事件
});

function sendToServer(eventName: string, event: any) {
  fetch('https://violet.ghtinc.com/tracking/webpixel', {
    method: 'POST',
    body: JSON.stringify({ eventName, ...event }),
    headers: { 'Content-Type': 'application/json' }
  });
}
