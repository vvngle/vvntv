#!/usr/bin/env node
/* eslint-disable */
// AUTO-GENERATED SCRIPT: Converts config.json to TypeScript definition.
// Usage: node scripts/convert-config.js

const fs = require('fs');
const path = require('path');

// Resolve project root (one level up from scripts folder)
const projectRoot = path.resolve(__dirname, '..');

// Paths
const configPath = path.join(projectRoot, 'config.json');
const libDir = path.join(projectRoot, 'src', 'lib');
const oldRuntimePath = path.join(libDir, 'runtime.ts');
const newRuntimePath = path.join(libDir, 'runtime.ts');

// Delete the old runtime.ts file if it exists
if (fs.existsSync(oldRuntimePath)) {
  fs.unlinkSync(oldRuntimePath);
  console.log('旧的 runtime.ts 已删除');
}

// Read and parse config.json
let rawConfig;
try {
  rawConfig = fs.readFileSync(configPath, 'utf8');
} catch (err) {
  console.error(`无法读取 ${configPath}:`, err);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(rawConfig);
} catch (err) {
  console.error('config.json 不是有效的 JSON:', err);
  process.exit(1);
}

// Prepare TypeScript file content
const tsContent =
  `// 该文件由 scripts/convert-config.js 自动生成，请勿手动修改\n` +
  `/* eslint-disable */\n\n` +
  `export const config = ${JSON.stringify(config, null, 2)} as const;\n\n` +
  `export type RuntimeConfig = typeof config;\n\n` +
  `export default config;\n`;

// Ensure lib directory exists
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// Write to runtime.ts
try {
  fs.writeFileSync(newRuntimePath, tsContent, 'utf8');
  console.log('已生成 src/lib/runtime.ts');
} catch (err) {
  console.error('写入 runtime.ts 失败:', err);
  process.exit(1);
}
// scripts/convert-config.js 底部追加这 30 行（保留原有所有代码）

// —— 开始追加 ——
const extraCode = `
// === MoonTV 增强功能：自动重试 + 备用源切换 ===
// 自动重试（默认 3 次）
export async function fetchWithRetry(url: string, retries = CONFIG.retry_attempts || 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { 
        cache: 'force-cache',
        next: { revalidate: CONFIG.cache_time || 7200 }
      });
      if (res.ok) return await res.json();
    } catch (e) {
      if (i === retries - 1) console.log('[MoonTV] 主源彻底失效 →', url);
      else await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }

  // 重试完还不行 → 自动切换备用源
  for (const key in CONFIG.api_site) {
    const site = CONFIG.api_site[key];
    if (site.api === url && site.backup) {
      console.log('[MoonTV] 主源失效，自动切换备用源 →', site.backup);
      try {
        const res = await fetch(site.backup, { cache: 'force-cache' });
        if (res.ok) return await res.json();
      } catch (_) {}
    }
  }

  throw new Error('所有源都挂了');
}
`;

fs.appendFileSync(runtimePath, '\n' + extraCode);
console.log('已注入 fetchWithRetry + 备用源切换功能');
