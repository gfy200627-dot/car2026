<template>
  <div class="main-layout">
    <aside class="main-layout__sidebar">
      <button class="main-layout__mini-brand" type="button" aria-label="返回首页" @click="router.push('/dashboard')">AI</button>
      <nav class="main-layout__side-nav" aria-label="快捷导航">
        <button v-for="item in sideMenus" :key="item.path" type="button" class="main-layout__side-item" :class="{ 'is-active': isActive(item.path) }" :title="item.title" @click="router.push(item.path)">
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.shortTitle }}</span>
        </button>
      </nav>
      <span class="main-layout__side-foot">AI</span>
    </aside>

    <div class="main-layout__content">
      <AppHeader />
      <main class="main-layout__body">
        <router-view v-slot="{ Component }">
          <transition name="fade-up" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataLine, Grid, MagicStick, Odometer, Operation, TrendCharts } from '@element-plus/icons-vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { routes } from '@/router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const iconMap: Record<string, unknown> = { Odometer, DataLine, Grid, Operation, MagicStick, TrendCharts }

const sideMenus = computed(() => {
  const main = routes.find((r) => r.path === '/')
  const children = (main?.children ?? []) as { path: string; meta?: Record<string, unknown> }[]
  return children
    .filter((c) => {
      const meta = c.meta ?? {}
      if (meta.hidden) return false
      const roles = meta.roles as string[] | undefined
      return userStore.hasRole(roles as never)
    })
    .slice(0, 6)
    .map((c) => ({ path: `/${c.path}`, title: String(c.meta?.title ?? c.path), shortTitle: String(c.meta?.title ?? c.path).slice(0, 1), icon: iconMap[String(c.meta?.icon ?? 'Grid')] ?? Grid }))
})

function isActive(path: string): boolean { return route.path === path || route.path.startsWith(`${path}/`) }
</script>

<style scoped lang="scss">
.main-layout { min-height: 100vh; background: var(--ai-bg-base); color: var(--ai-text-1); }
.main-layout__sidebar { position: fixed; inset: 0 auto 0 0; z-index: var(--ai-z-sidebar); display: flex; width: var(--ai-sidebar-width); flex-direction: column; align-items: center; padding: 20px 0 18px; border-right: 1px solid var(--ai-border); background: var(--ai-bg-panel); }
.main-layout__mini-brand { display: grid; place-items: center; width: 36px; height: 36px; border: 0; background: var(--ai-brand); color: var(--ai-text-inverse); font-size: 11px; font-weight: 700; letter-spacing: .04em; cursor: pointer; }
.main-layout__side-nav { display: flex; flex: 1; width: 100%; flex-direction: column; align-items: center; gap: 8px; padding-top: 32px; }
.main-layout__side-item { position: relative; display: flex; width: 72px; min-height: 60px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 0; background: transparent; color: var(--ai-text-4); cursor: pointer; transition: color var(--ai-duration-base) var(--ai-ease), background var(--ai-duration-base) var(--ai-ease); }
.main-layout__side-item span { font-size: 10px; letter-spacing: .02em; }
.main-layout__side-item:hover, .main-layout__side-item.is-active { color: var(--ai-text-1); background: var(--ai-bg-subtle); }
.main-layout__side-item.is-active::before { content: ''; position: absolute; left: 0; width: 2px; height: 28px; background: var(--ai-brand); }
.main-layout__side-foot { color: var(--ai-text-4); font-family: var(--ai-font-mono); font-size: 9px; letter-spacing: .08em; }
.main-layout__content { min-width: 0; min-height: 100vh; margin-left: var(--ai-sidebar-width); }
.main-layout__body { width: 100%; min-width: 0; overflow-x: hidden; }
@media (max-width: 900px) { .main-layout__sidebar { width: 64px; } .main-layout__content { margin-left: 64px; } .main-layout__side-item { width: 56px; } }
@media (max-width: 720px) { .main-layout__sidebar { display: none; } .main-layout__content { margin-left: 0; } }
</style>
