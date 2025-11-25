// src/app/api/search/route.ts
import { NextResponse } from 'next/server'
import config from '@/config.json'

const CACHE_TIME = config.cache_time || 7200
const RETRY_TIMES = config.retry_attempts || 3

// 神级 fetch：自动重试 + 超时保护 + 备用源兜底
async function fetchSafe(url: string) {
  for (let i = 0; i < RETRY_TIMES; i++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000) // 9秒超时

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache',
        next: { revalidate: CACHE_TIME },
      })
      clearTimeout(timeout)
      if (res.ok) return await res.json()
    } catch (e) {
      clearTimeout(timeout)
      if (i === RETRY_TIMES - 1) console.log('[MoonTV] 主源彻底失效 →', url)
      else await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 主源挂了 → 找 backup
  for (const key in config.api_site) {
    const site = config.api_site[key]
    if (site.api === url && site.backup) {
      console.log('[MoonTV] 自动切换备用源 →', site.backup)
      try {
        const res = await fetch(site.backup, { cache: 'force-cache' })
        if (res.ok) return await res.json()
      } catch (_) {}
    }
  }

  return { list: [] } // 都挂了也绝不崩站
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ list: [], total: 0 })

  const results = await Promise.all(
    Object.values(config.api_site).map(async (site: any) => {
      const url = `${site.api}?wd=${encodeURIComponent(q)}`
      const data = await fetchSafe(url)
      return (data.list || []).map((item: any) => ({
        ...item,
        $source: site.name,
      }))
    })
  )

  const list = results.flat().slice(0, 80)
  return NextResponse.json({ list, total: list.length })
}
