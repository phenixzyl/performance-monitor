const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;

// --- 辅助函数：格式化日期为本地时区字符串 ---
/**
 * @param {Date} date 要格式化的日期对象
 * @param {string} format 'date' | 'datetime'
 * @returns {string} 格式化后的字符串
 */
function formatLocalDate(date, format = "datetime") {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  if (format === "date") {
    return `${year}-${month}-${day}`;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// --- 中间件配置 ---
app.use(cors());
// 解析 content-type 为 application/json 的请求体
app.use(express.json());
// 解析 content-type 为 text/plain 的请求体
app.use(express.text());

// --- 日志根目录 ---
const logsBaseDir = path.join(__dirname, "project-logs");

// 确保日志根目录存在
if (!fs.existsSync(logsBaseDir)) {
  fs.mkdirSync(logsBaseDir);
}

// --- API 接口 ---
app.post("/api/log-performance", (req, res) => {
  try {
    // 兼容 JSON 和纯文本请求
    const logData =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { projectName } = logData;

    // 1. 验证项目名称是否存在
    if (
      !projectName ||
      typeof projectName !== "string" ||
      projectName.trim() === ""
    ) {
      return res.status(400).send("Bad Request: projectName is required.");
    }

    // 2. 清理项目名称，防止目录遍历攻击 (例如 '..', '/')
    const sanitizedProjectName = projectName.replace(/[^a-z0-9_-]/gi, "_");
    if (sanitizedProjectName === "") {
      return res.status(400).send("Bad Request: Invalid projectName.");
    }

    // 3. 创建项目专属的日志文件夹
    const projectLogDir = path.join(logsBaseDir, sanitizedProjectName);
    if (!fs.existsSync(projectLogDir)) {
      fs.mkdirSync(projectLogDir, { recursive: true });
    }

    // 4. 根据当天本地日期创建日志文件名 (已修改)
    const today = formatLocalDate(new Date(), "date"); // e.g., "2025-12-01"
    const logFilePath = path.join(projectLogDir, `${today}.log`);

    // 5. 构造日志条目 (已修改)
    const timestamp = formatLocalDate(new Date(logData.timestamp));
    const value =
      typeof logData.value === "number"
        ? logData.value.toFixed(4)
        : logData.value;
    const logEntry = `${timestamp} | ${logData.name} | Value: ${value} | Rating: ${logData.rating} | Path: ${logData.path}\n`;

    // 6. 将日志追加到对应的文件中
    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error(
          `[${sanitizedProjectName}] Failed to write to log file:`,
          err
        );
      }
    });

    console.log(`Metric received for [${sanitizedProjectName}]:`, logData.name);
    res.status(204).send();
  } catch (error) {
    console.error("Error processing log:", error);
    res.status(400).send("Bad Request: Invalid JSON payload.");
  }
});

// --- 启动服务器 ---
app.listen(PORT, () => {
  console.log(
    `✅ Generic performance logging server is running on http://localhost:${PORT}`
  );
  console.log(`Logs will be written to subdirectories in: ${logsBaseDir}`);
});
