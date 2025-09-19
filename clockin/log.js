const cron = require("node-cron");
const os = require("os");
const { performance } = require("perf_hooks");

class PerformanceTest {
  constructor(config = {}) {
    this.totalCrons = config.totalCrons || 100;
    this.jobDurationSeconds = config.jobDurationSeconds || 15;
    this.jobMetrics = [];
    this.tasks = [];
    this.startTime = null;
    this.intervalId = null;
  }

  getSystemMetrics() {
    const cpuInfo = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpuLoad: os.loadavg()[0],
      memoryMetrics: {
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        used: this.formatBytes(usedMem),
        usedPercent: ((usedMem / totalMem) * 100).toFixed(2),
      },
      cpuCount: cpuInfo.length,
      uptime: os.uptime(),
    };
  }

  formatBytes(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  }

  async simulateLoad() {
    // More realistic CPU load simulation
    return new Promise((resolve) => {
      const start = performance.now();
      let sum = 0;
      // Adjust iteration count based on system capability
      for (let j = 0; j < 1e6; j++) {
        sum += Math.sqrt(j);
      }
      resolve(performance.now() - start);
    });
  }

  startMonitoring() {
    this.startTime = performance.now();
    // Monitor system metrics every second
    this.intervalId = setInterval(() => {
      const metrics = this.getSystemMetrics();
      console.log(`\nSystem Metrics at ${new Date().toISOString()}:`);
      console.log(`CPU Load: ${metrics.cpuLoad.toFixed(2)}`);
      console.log(`Memory Usage: ${metrics.memoryMetrics.usedPercent}%`);
      console.log(`Free Memory: ${metrics.memoryMetrics.free}`);
    }, 1000);
  }

  async start() {
    console.log(
      `Starting performance test with ${this.totalCrons} cron jobs...`
    );
    this.startMonitoring();

    for (let i = 0; i < this.totalCrons; i++) {
      const task = cron.schedule("* * * * * *", async () => {
        const start = performance.now();
        const executionTime = await this.simulateLoad();

        this.jobMetrics.push({
          jobId: i,
          timestamp: new Date().toISOString(),
          executionTime: executionTime.toFixed(2),
          systemMetrics: this.getSystemMetrics(),
        });
      });

      this.tasks.push(task);
    }

    // Stop test after duration
    setTimeout(() => this.stop(), this.jobDurationSeconds * 1000);
  }

  stop() {
    // Stop all cron tasks
    this.tasks.forEach((task, index) => {
      task.stop();
      console.log(`Stopped Job ${index}`);
    });

    // Stop monitoring
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.generateReport();
  }

  generateReport() {
    const endTime = performance.now();
    const totalDuration = (endTime - this.startTime) / 1000;
    const metrics = this.getSystemMetrics();

    console.log("\n=== Performance Test Report ===");
    console.log(`Test Duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`Total Jobs Executed: ${this.jobMetrics.length}`);

    const avgExecTime =
      this.jobMetrics.reduce(
        (acc, curr) => acc + parseFloat(curr.executionTime),
        0
      ) / this.jobMetrics.length;
    console.log(`Average Execution Time: ${avgExecTime.toFixed(2)} ms`);

    const sortedMetrics = [...this.jobMetrics].sort(
      (a, b) => parseFloat(b.executionTime) - parseFloat(a.executionTime)
    );
    console.log(
      `Slowest Job: ${sortedMetrics[0].executionTime} ms (Job ${sortedMetrics[0].jobId})`
    );
    console.log(
      `Fastest Job: ${
        sortedMetrics[sortedMetrics.length - 1].executionTime
      } ms (Job ${sortedMetrics[sortedMetrics.length - 1].jobId})`
    );

    console.log("\nDetailed Memory Usage:");
    console.log(`Total Memory: ${metrics.memoryMetrics.total}`);
    console.log(
      `Used Memory: ${metrics.memoryMetrics.used} (${metrics.memoryMetrics.usedPercent}%)`
    );
    console.log(`Free Memory: ${metrics.memoryMetrics.free}`);

    console.log("\nSystem Info:");
    console.log(`CPU Cores: ${metrics.cpuCount}`);
    console.log(`CPU Load: ${metrics.cpuLoad.toFixed(2)}`);
    console.log(`System Uptime: ${(metrics.uptime / 60).toFixed(2)} minutes`);
  }
}

// Usage
const test = new PerformanceTest({
  totalCrons: 100,
  jobDurationSeconds: 15,
});

test.start();
