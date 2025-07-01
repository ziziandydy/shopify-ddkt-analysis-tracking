import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient;
}

// Prisma 客戶端配置
const createPrismaClient = () => {
  console.log("【Database】創建 Prisma 客戶端...");

  const config: any = {
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  };

  // 生產環境：針對無伺服器環境優化
  if (process.env.NODE_ENV === 'production') {
    console.log("【Database】使用生產環境配置");
  }

  return new PrismaClient(config);
};

// 開發環境：使用全域實例避免熱重載時創建多個連接
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    console.log("【Database】開發環境：創建全域 Prisma 實例");
    global.prismaGlobal = createPrismaClient();
  }
  var prisma = global.prismaGlobal;
} else {
  // 生產環境：每次請求創建新實例（無伺服器環境最佳實踐）
  console.log("【Database】生產環境：創建新的 Prisma 實例");
  var prisma = createPrismaClient();
}

// 連接測試函數
export async function testDatabaseConnection() {
  try {
    console.log("【Database】測試資料庫連接...");
    await prisma.$connect();
    console.log("【Database】資料庫連接成功");

    // 測試查詢
    const sessionCount = await prisma.session.count();
    console.log("【Database】Session 表記錄數:", sessionCount);

    return { success: true, sessionCount };
  } catch (error: any) {
    console.error("【Database】資料庫連接測試失敗:", error);
    console.error("【Database】錯誤詳情:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    });

    return {
      success: false,
      error: {
        message: error?.message,
        code: error?.code,
        meta: error?.meta
      }
    };
  }
}

// 優雅的關閉函數
export async function closeDatabaseConnection() {
  try {
    console.log("【Database】關閉資料庫連接...");
    await prisma.$disconnect();
    console.log("【Database】資料庫連接已關閉");
  } catch (error: any) {
    console.error("【Database】關閉資料庫連接時發生錯誤:", error);
  }
}

// 健康檢查函數
export async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error?.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default prisma;
