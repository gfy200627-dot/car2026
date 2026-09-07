<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-header__brand" @click="$router.push('/dashboard')">
        <span class="app-header__logo">AI</span>
        <span class="app-header__name">
          <b>AutoInsight</b>
        </span>
      </div>

      <nav class="app-header__nav">
        <button
          v-for="item in menus"
          :key="item.path"
          type="button"
          class="app-header__nav-item"
          :class="{ 'is-active': isActive(item.path) }"
          @click="$router.push(item.path)"
        >
          {{ item.title }}
        </button>
      </nav>

      <div class="app-header__actions">
        <el-popover placement="bottom-end" :width="340" trigger="click" popper-class="notice-popper">
          <template #reference>
            <button class="app-header__icon-btn" type="button">
              <el-badge :value="appStore.unreadCount" :hidden="!appStore.unreadCount" :max="9">
                <el-icon :size="16"><Bell /></el-icon>
              </el-badge>
            </button>
          </template>
          <div class="notice">
            <header class="notice__head">
              <span>通知中心</span>
              <el-button link type="primary" size="small" @click="appStore.markAllRead()">全部已读</el-button>
            </header>
            <ul class="notice__list">
              <li v-for="n in appStore.notices" :key="n.id" class="notice__item" :class="{ 'is-read': n.read }">
                <span class="notice__dot" :class="`is-${n.type}`" />
                <div class="notice__content">
                  <p class="notice__title">{{ n.title }}</p>
                  <p class="notice__desc">{{ n.desc }}</p>
                  <span class="notice__time">{{ n.time }}</span>
                </div>
              </li>
            </ul>
          </div>
        </el-popover>

        <el-dropdown trigger="click" @command="onCommand">
          <button class="app-header__user" type="button">
            <span class="app-header__avatar">{{ userStore.avatarText }}</span>
            <span class="app-header__username">{{ userStore.nickname }}</span>
            <StatusTag :status="userStore.role" :dot="false" />
            <el-icon :size="12"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                <span>个人中心</span>
              </el-dropdown-item>
              <el-dropdown-item v-if="userStore.isAdmin" command="admin">
                <el-icon><Setting /></el-icon>
                <span>管理后台</span>
              </el-dropdown-item>
              <el-dropdown-item v-if="userStore.role === 'sales'" command="adminOrders">
                <el-icon><Tickets /></el-icon>
                <span>订单管理</span>
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Bell, Setting, SwitchButton, Tickets, User } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { routes } from '@/router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

/** 主导航：来自路由表中 MainLayout 的子路由，并按角色过滤 */
const menus = computed(() => {
  const main = routes.find((r) => r.path === '/')
  const children = (main?.children ?? []) as { path: string; meta?: Record<string, unknown> }[]
  return children
    .filter((c) => {
      const meta = c.meta ?? {}
      if (meta.hidden) return false
      const roles = meta.roles as string[] | undefined
      return userStore.hasRole(roles as never)
    })
    .map((c) => ({
      path: `/${c.path}`,
      title: String(c.meta?.title ?? c.path)
    }))
})

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function onCommand(command: string): void {
  if (command === 'profile') void router.push('/profile')
  if (command === 'admin') void router.push('/admin/overview')
  if (command === 'adminOrders') void router.push('/admin/orders')
  if (command === 'logout') {
    void ElMessageBox.confirm('确认退出当前账号？', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
      .then(() => {
        userStore.logout()
        void router.push('/login')
      })
      .catch(() => undefined)
  }
}
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 12px;
  z-index: var(--ai-z-header);
  height: var(--ai-header-height);
  margin: 0 auto;
  padding: 0 var(--ai-space-6);
  background: transparent;
}

.app-header__inner {
  display: flex;
  align-items: center;
  gap: var(--ai-space-5);
  height: 100%;
  padding: 0 var(--ai-space-5);
  max-width: var(--ai-content-max);
  margin: 0 auto;
  border: 1px solid var(--ai-border);
  border-radius: var(--ai-radius-lg);
  background: rgba(12, 16, 24, 0.78);
  backdrop-filter: blur(18px);
  box-shadow: var(--ai-shadow-md), var(--ai-shadow-inset);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.app-header__logo {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8fafc, #9aa6b8 48%, #d4af37);
  color: #07090d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 28px rgba(212, 175, 55, 0.16);
}

.app-header__name {
  display: flex;
  flex-direction: column;
  line-height: 1.2;

  b { font-size: 16px; font-weight: 650; color: var(--ai-text-1); letter-spacing: 0; }
}

.app-header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.app-header__nav-item {
  position: relative;
  padding: 9px 14px;
  border: 0;
  background: transparent;
  color: var(--ai-text-2);
  font-size: var(--ai-fs-sm);
  white-space: nowrap;
  cursor: pointer;
  border-radius: var(--ai-radius-sm);
  transition: color var(--ai-duration-base) var(--ai-ease), background var(--ai-duration-base) var(--ai-ease);

  &:hover { color: var(--ai-text-1); background: var(--ai-bg-subtle); }

  &.is-active {
    color: #f4f7fb;
    background: var(--ai-brand-ghost);

    &::after {
      content: '';
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 5px;
      height: 2px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--ai-brand), var(--ai-nev));
    }
  }
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  flex-shrink: 0;
}

.app-header__icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--ai-radius-sm);
  border: 1px solid var(--ai-border);
  background: transparent;
  color: var(--ai-text-2);
  cursor: pointer;
  transition: all var(--ai-duration-base) var(--ai-ease);

  &:hover { color: var(--ai-text-1); border-color: var(--ai-border-strong); background: var(--ai-bg-subtle); }
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: var(--ai-radius-pill);
  border: 1px solid var(--ai-border);
  background: transparent;
  color: var(--ai-text-1);
  cursor: pointer;
  transition: all var(--ai-duration-base) var(--ai-ease);

  &:hover { border-color: var(--ai-border-strong); background: var(--ai-bg-subtle); }
}

.app-header__avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ai-brand), var(--ai-purple));
  color: #fff;
  font-size: var(--ai-fs-xs);
  font-weight: 600;
}

.app-header__username {
  font-size: var(--ai-fs-xs);
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .app-header { padding: 0 var(--ai-space-4); }
  .app-header__inner { gap: var(--ai-space-4); padding: 0 var(--ai-space-4); }
}

@media (max-width: 1024px) {
  .app-header__name { display: none; }
}
</style>

<style lang="scss">
/* 通知弹层（非 scoped，作用于 popper） */
.notice__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--ai-border);
  font-size: var(--ai-fs-sm);
  color: var(--ai-text-1);
  font-weight: 600;
}

.notice__list {
  max-height: 340px;
  overflow-y: auto;
}

.notice__item {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--ai-border);

  &.is-read { opacity: 0.55; }

  &:last-child { border-bottom: 0; }
}

.notice__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;

  &.is-success { background: var(--ai-nev); }
  &.is-info { background: var(--ai-brand); }
  &.is-warning { background: var(--ai-warn); }
  &.is-danger { background: var(--ai-danger); }
}

.notice__content { flex: 1; min-width: 0; }

.notice__title {
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-1);
  font-weight: 500;
}

.notice__desc {
  margin-top: 3px;
  font-size: var(--ai-fs-mini);
  color: var(--ai-text-3);
  line-height: 1.5;
}

.notice__time {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--ai-text-4);
}
</style>
