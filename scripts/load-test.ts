import http from 'http';
import { app } from '../apps/api/src/app';
import { prisma } from '../apps/api/src/lib/prisma';
import { redis } from '../apps/api/src/lib/redis';

interface BenchmarkResult {
  endpoint: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  durationSec: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  avgMs: number;
  errorRatePercent: number;
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function benchmarkEndpoint(
  port: number,
  path: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {},
  totalIterations = 50,
  concurrency = 5
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  const runRequest = async (): Promise<void> => {
    const start = performance.now();
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            const duration = performance.now() - start;
            latencies.push(duration);
            if (res.statusCode && res.statusCode < 400) {
              successCount++;
            } else {
              failureCount++;
            }
            resolve();
          });
        }
      );

      req.on('error', () => {
        const duration = performance.now() - start;
        latencies.push(duration);
        failureCount++;
        resolve();
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  const startTime = performance.now();

  // Execute in controlled concurrency batches
  for (let i = 0; i < totalIterations; i += concurrency) {
    const batchSize = Math.min(concurrency, totalIterations - i);
    const batch = Array.from({ length: batchSize }, () => runRequest());
    await Promise.all(batch);
  }

  const totalDurationSec = (performance.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const avgMs = latencies.reduce((acc, v) => acc + v, 0) / (latencies.length || 1);
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const rps = totalDurationSec > 0 ? totalIterations / totalDurationSec : 0;
  const errorRatePercent = (failureCount / (totalIterations || 1)) * 100;

  return {
    endpoint: method + ' ' + path,
    totalRequests: totalIterations,
    successCount,
    failureCount,
    durationSec: Number(totalDurationSec.toFixed(2)),
    rps: Number(rps.toFixed(1)),
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avgMs: Number(avgMs.toFixed(2)),
    errorRatePercent: Number(errorRatePercent.toFixed(1)),
  };
}

async function runControlledLoadTest() {
  console.log('🚀 Starting Controlled Production Load Test...');
  console.log('⚡ Concurrency: 5-10 workers | Total Requests per Endpoint: 50 | Mode: In-Process Controlled\n');

  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
  const address = testServer.address() as any;
  const port = address.port;

  const validApiKey = 'ck_live_ecommerce_test_key_2026';

  const results: BenchmarkResult[] = [];

  // 1. Health Probe
  results.push(await benchmarkEndpoint(port, '/health', 'GET', undefined, {}, 50, 10));

  // 2. Ready Probe (with DB check)
  results.push(await benchmarkEndpoint(port, '/ready', 'GET', undefined, {}, 30, 5));

  // 3. Serviceability Lookup
  results.push(
    await benchmarkEndpoint(
      port,
      '/api/pricing/serviceability/110001',
      'GET',
      undefined,
      { 'x-api-key': validApiKey },
      40,
      5
    )
  );

  // 4. Pricing Quote Calculation
  results.push(
    await benchmarkEndpoint(
      port,
      '/api/pricing/quote',
      'POST',
      {
        pickupPincode: '110001',
        deliveryPincode: '800001',
        weight: 1.5,
        length: 20,
        width: 15,
        height: 10,
        shipmentType: 'PREPAID',
        codAmount: 0,
      },
      { 'x-api-key': validApiKey },
      40,
      5
    )
  );

  // 5. Tracking Lookup
  results.push(await benchmarkEndpoint(port, '/api/tracking/TRK-BENCHMARK-TEST', 'GET', undefined, {}, 40, 5));

  testServer.close();
  await Promise.allSettled([prisma.$disconnect(), redis.disconnect()]);

  console.log('\n========================================================================================================');
  console.log('| Controlled Load Benchmark Summary (p50, p95, p99 Latency & Throughput)                               |');
  console.log('========================================================================================================');
  console.table(results);
  console.log('========================================================================================================\n');
}

runControlledLoadTest().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
