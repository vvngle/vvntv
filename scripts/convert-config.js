// scripts/convert-config.js —— 终极增强版（原版完全兼容）
import fs from 'fs'
import path from 'path'

const configPath = path.resolve(process.cwd(), 'config.json')
const runtimePath = path.resolve(process.cwd(), 'src/lib/runtime.ts')

if (!fs.existsSync(configPath)) {
  console.error('config.json 不存在！')
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

// 生成基础配置
let code = `// 本文件由 scripts/convert-config.js 自动生成，禁止手动修改！
export const CONFIG = ${JSON.stringify(config, null, 2)} as const;

// 自动重试 + 备用源 + 超时保护（MoonTV 专属神技）
export async function fetchSafe(url: string): Promise<any> {
  const RETRY = CONFIG.retry_attempts || 3;
  const TIMEOUT = 9000;

  for (let i = 0; i < RETRY; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache',
        next: { revalidate: CONFIG.cache_time || 7200 },
      });
      clearTimeout(id);
      if (res.ok) return await res.json();
    } catch (e) {
      clearTimeout(id);
      if (i === RETRY - 1) console.log('[MoonTV] 主源失效 →', url);
      else await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 备用源兜底
  for (const key in CONFIG.api_site) {
    const site = CONFIG.api_site[key];
    if (site.api === url && site.backup) {
      console.log('[MoonTV] 自动切换备用源 →', site.backup);
      try {
        const res = await fetch(site.backup, { cache: 'force-cache' });
        if (res.ok) return await res.json();
      } catch (_) {}
    }
  }

  return { list: [] }; // 彻底挂了也绝不崩站
}
`;

// 写文件
fs.writeFileSync(runtimePath, code, 'utf-8')
console.log('runtime.ts 已生成，自动重试 + 备用源已注入！')
