#!/usr/bin/env node
/**
 * Students Page - Automated Health Check
 * 
 * This script performs a quick health check on the students page
 * to verify that the application is running and responsive.
 * 
 * Usage: node students-health-check.js
 */

const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`),
};

async function checkEndpoint(path, description) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      const duration = Date.now() - startTime;
      const success = res.statusCode === 200;
      
      if (success) {
        log.success(`${description} (${res.statusCode}) - ${duration}ms`);
      } else {
        log.error(`${description} (${res.statusCode}) - ${duration}ms`);
      }
      
      resolve({ success, statusCode: res.statusCode, duration });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      log.error(`${description} - ${err.message}`);
      resolve({ success: false, error: err.message, duration });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      log.error(`${description} - Timeout (>${duration}ms)`);
      resolve({ success: false, error: 'Timeout', duration });
    });

    req.end();
  });
}

async function checkAPIEndpoint(path, description) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      const duration = Date.now() - startTime;
      let rawData = '';
      
      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        const success = res.statusCode === 200 || res.statusCode === 401; // 401 means API exists but needs auth
        
        if (res.statusCode === 200) {
          log.success(`${description} (${res.statusCode}) - ${duration}ms`);
          resolve({ success: true, statusCode: res.statusCode, duration, data: rawData });
        } else if (res.statusCode === 401) {
          log.warn(`${description} - Auth required (expected) - ${duration}ms`);
          resolve({ success: true, statusCode: res.statusCode, duration });
        } else {
          log.error(`${description} (${res.statusCode}) - ${duration}ms`);
          resolve({ success: false, statusCode: res.statusCode, duration });
        }
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      log.error(`${description} - ${err.message}`);
      resolve({ success: false, error: err.message, duration });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      log.error(`${description} - Timeout (>${duration}ms)`);
      resolve({ success: false, error: 'Timeout', duration });
    });

    req.end();
  });
}

async function runHealthCheck() {
  log.header('═══════════════════════════════════════════════════');
  log.header('   STUDENTS PAGE - HEALTH CHECK');
  log.header('   URL: http://localhost:3000/students');
  log.header('═══════════════════════════════════════════════════');

  const results = [];

  // 1. Check if server is running
  log.header('\n[1] Server Availability');
  const serverCheck = await checkEndpoint('/', 'Server is running');
  results.push({ test: 'Server Running', ...serverCheck });

  // 2. Check students page
  log.header('\n[2] Students Page');
  const studentsPage = await checkEndpoint('/students', 'Students page loads');
  results.push({ test: 'Students Page', ...studentsPage });

  // 3. Check API endpoints (if accessible)
  log.header('\n[3] API Endpoints');
  log.info('Checking API endpoints (may require authentication)...');
  
  const apiChecks = [
    checkAPIEndpoint('/api/students', 'GET /api/students'),
    checkAPIEndpoint('/api/classes', 'GET /api/classes'),
    checkAPIEndpoint('/api/sections', 'GET /api/sections'),
    checkAPIEndpoint('/api/academic-years/current', 'GET /api/academic-years/current'),
  ];

  const apiResults = await Promise.all(apiChecks);
  results.push(...apiResults.map((r, i) => ({ 
    test: ['Students API', 'Classes API', 'Sections API', 'Academic Year API'][i], 
    ...r 
  })));

  // 4. Performance Summary
  log.header('\n[4] Performance Summary');
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
  const slowChecks = results.filter(r => r.duration > 1000);
  
  if (avgDuration < 500) {
    log.success(`Average response time: ${avgDuration.toFixed(0)}ms (Excellent)`);
  } else if (avgDuration < 1000) {
    log.warn(`Average response time: ${avgDuration.toFixed(0)}ms (Good)`);
  } else {
    log.warn(`Average response time: ${avgDuration.toFixed(0)}ms (Slow)`);
  }

  if (slowChecks.length > 0) {
    log.warn(`Slow endpoints detected (>1s): ${slowChecks.length}`);
    slowChecks.forEach(check => {
      log.warn(`  - ${check.test}: ${check.duration}ms`);
    });
  }

  // 5. Final Summary
  log.header('\n[5] Test Results Summary');
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\n  Total Tests: ${total}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  }
  console.log(`  Pass Rate: ${passRate}%`);

  // 6. Final Verdict
  log.header('\n═══════════════════════════════════════════════════');
  if (passed === total) {
    log.success('ALL CHECKS PASSED ✓');
    log.info('Students page is working perfectly!');
  } else if (passed >= total * 0.7) {
    log.warn('SOME CHECKS FAILED');
    log.info('Students page is partially working. Check failures above.');
  } else {
    log.error('CRITICAL FAILURES DETECTED');
    log.error('Students page may not be working properly.');
  }
  log.header('═══════════════════════════════════════════════════\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the health check
runHealthCheck().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
