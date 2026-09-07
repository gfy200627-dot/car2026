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
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 260px),
    radial-gradient(1100px 560px at 14% -12%, rgba(96, 165, 250, 0.09), transparent 62%),
    radial-gradient(900px 460px at 92% -8%, rgba(212, 175, 55, 0.07), transparent 58%),
    var(--ai-bg-base);
}

.main-layout__body {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}
</style>
