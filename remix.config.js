/** @type {import('@remix-run/dev').AppConfig} */
export default {
    ignoredRouteFiles: ["**/.*"],
    serverModuleFormat: "esm",
    serverPlatform: "node",
    tailwind: false,
    postcss: false,
    watchPaths: ["./tailwind.config.ts"],
    serverDependenciesToBundle: [
        /^@shopify\/shopify-app-remix.*/,
        /^@shopify\/shopify-app-session-storage-prisma.*/,
        /^@shopify\/app-bridge-react.*/,
        /^@shopify\/polaris.*/,
    ],
    future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
    },
    // Vercel 部署設定
    serverBuildTarget: "vercel",
    server: "./server.js",
}; 