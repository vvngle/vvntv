// scripts/convert-config.js —— Cloudflare Pages 终极兼容版（CommonJS）
const fs = require('fs')
const path = require('path')

const configPath = path.resolve(process.cwd(), 'config.json')
const runtimePath = path.resolve(process.cwd(), 'src/lib/runtime.ts')

if (!fs.existsSync(configPath)) {
  console.error('config.json 不存在！')
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

// 生成 runtime.ts
let code = `// 本文件由 scripts/convert-config.js 自动生成，禁止手动修改！
import type { Config } from '@/types'

export const CONFIG = ${JSON.stringify(config, null, 2)} as const

// 神级 fetchSafe：自动重试 + 超时 + 备用源 + 永不崩站
export async function fetchSafe(url: string): Promise<any> {
  const RETRY = (CONFIG as any).retry_attempts || 3
  const TIMEOUT = 9000

  for (let i = 0; i < RETRY; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache',
        next: { revalidate: (CONFIG as any).cache_time || 7200 },
      })
      clearTimeout(timer)
      if (res.ok) return await res.json()
    } catch (e) {
      clearTimeout(timer)
      if (i === RETRY - 1) console.log('[MoonTV] 主源彻底失效 →', url)
      else await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 备用源兜底
  for (const key in (CONFIG as any).api_site) {
    const site = (CONFIG as any).api_site[key]
    if (site.api === url && site.backup) {
      console.log('[MoonTV] 自动切换备用源 →', site.backup)
      try {
        const res = await fetch(site.backup, { cache: 'force-cache' })
        if (res.ok) return await res.json()
      } catch (_) { }
    }
  }

  return { list: [] }
}
`

fs.writeFileSync(runtimePath, code, 'utf-8')
console.log('runtime.ts 已成功生成，自动重试 + 备用源已注入！')
