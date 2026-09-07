<template>
  <div class="main-layout">
    <AppHeader />

    <main class="main-layout__body">
      <router-view v-slot="{ Component }">
        <transition name="fade-up" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<style scoped lang="scss">
.main-layout {
  min-height: 100vh;
  background: var(--ai-bg-base);
  color: var(--ai-text-1);
}

.main-layout__body {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}
</style>
