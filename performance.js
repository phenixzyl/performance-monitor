import { onTTFB, onFCP, onLCP, onCLS, onINP } from "web-vitals";

// 模块级变量，用于存储当前项目名称
let currentProjectName = "default-project";

/**
 * ----------------------------------------------------------------
 * 1. 中央报告函数 (Central Reporting Function)
 * ----------------------------------------------------------------
 * 将所有性能指标统一发送到后端。
 */
const reportMetric = (metric) => {
  // 在控制台为开发调试打印日志
  const ratingStyles = {
    good: "color: green;",
    needs_improvement: "color: orange;",
    poor: "color: red;",
  };
  const style = ratingStyles[metric.rating] || "color: black;";
  const value =
    metric.name === "CLS"
      ? metric.value.toFixed(4)
      : `${Math.round(metric.value)} ms`;
  console.log(
    `%c[${currentProjectName}] [${metric.name}]`,
    style,
    value,
    metric
  );

  // 准备发送到后端的数据体
  const body = JSON.stringify({
    projectName: currentProjectName, // **新增：带上项目名称**
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  });

  // 后端接口地址
  const endpoint = "http://47.117.18.236:3001/api/log-performance";

  // 使用 navigator.sendBeacon API 可靠地发送数据
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, { body, method: "POST", keepalive: true });
  }
};

/**
 * ----------------------------------------------------------------
 * 2. 核心 Web 指标 (使用 web-vitals)
 * ----------------------------------------------------------------
 */
const initCoreWebVitals = () => {
  try {
    onTTFB(reportMetric);
    onFCP(reportMetric);
    onLCP(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
  } catch (e) {
    console.error("Error initializing Core Web Vitals:", e);
  }
};

/**
 * ----------------------------------------------------------------
 * 3. 手动获取的补充指标
 * ----------------------------------------------------------------
 */
let totalBlockingTime = 0;

const initManualObservers = () => {
  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === "first-paint") {
          reportMetric({
            name: "FP",
            value: entry.startTime,
            rating:
              entry.startTime < 1800
                ? "good"
                : entry.startTime < 3000
                ? "needs_improvement"
                : "poor",
            entry,
          });
        }

        if (entry.entryType === "longtask") {
          const blockingTime = entry.duration - 50;
          if (blockingTime > 0) {
            totalBlockingTime += blockingTime;
          }
        }
      }
    });

    observer.observe({ type: "paint", buffered: true });
    observer.observe({ type: "longtask", buffered: true });

    // 在页面卸载前，上报最终的 TBT 值
    window.addEventListener("beforeunload", () => {
      reportMetric({
        name: "TBT (Total Blocking Time)",
        value: totalBlockingTime,
        rating:
          totalBlockingTime < 200
            ? "good"
            : totalBlockingTime < 600
            ? "needs_improvement"
            : "poor",
      });
    });
  } catch (e) {
    console.error("Error initializing manual observers:", e);
  }
};

/**
 * ----------------------------------------------------------------
 * 4. 总入口函数 (最重要的部分)
 * ----------------------------------------------------------------
 * @param {string} projectName - 你的项目名称，例如 'project-A' 或 'my-blog'。
 */
export function initPerformanceMonitoring(projectName = "default-project") {
  // 防止重复初始化
  if (window.performanceMonitoringInitialized) {
    return;
  }
  window.performanceMonitoringInitialized = true;

  // 存储项目名称
  currentProjectName = projectName;

  console.log(
    `%c[Performance] Monitoring Initialized for project: ${projectName}.`,
    "color: blue; font-weight: bold;"
  );
  initCoreWebVitals();
  initManualObservers();
}
