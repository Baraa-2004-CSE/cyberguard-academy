import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import pool, { testConnection } from "./config/db.js";

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    // التأكد من اتصال قاعدة البيانات قبل تشغيل السيرفر
    const connection = await pool.getConnection();
    console.log("Connected to MySQL database successfully!");
    connection.release();

    const server = app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });

    async function shutdown() {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Could not start the API:", error.message);
    process.exit(1);
  }
}

startServer();