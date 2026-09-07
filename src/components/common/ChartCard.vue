<template>
  <section class="ai-panel chart-card">
    <header class="ai-panel__header">
      <div>
        <h3 class="ai-panel__title">
          {{ title }}
        </h3>
      </div>
      <div class="chart-card__extra">
        <slot name="extra" />
      </div>
    </header>
    <div class="chart-card__body" :style="{ padding: flush ? '0' : 'var(--ai-space-4)' }">
      <ErrorState v-if="error" :message="error" compact @retry="emit('retry')" />
      <EmptyState v-else-if="empty" :description="emptyText" compact />
      <LoadingState v-else-if="loading" variant="chart" :height="height" />
      <slot v-else>
        <BaseChart :option="option ?? null" :height="height" />
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/charts/BaseChart.vue'
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import LoadingState from './LoadingState.vue'

/**
 * 图表卡片
 * 统一承载 loading / empty / error / success 四态，避免每处重复写状态判断
 */
defineProps<{
  title: string
  subtitle?: string
  /** 直接传入 option 时使用内置 BaseChart；也可通过默认插槽自定义内容 */
  option?: EChartsOption | null
  height?: number | string
  loading?: boolean
  empty?: boolean
  emptyText?: string
  error?: string
  /** 标记为示例数据 */
  mock?: boolean
  /** 去掉内边距（地图、表格类内容） */
  flush?: boolean
}>()

const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<style scoped lang="scss">
.chart-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.chart-card__extra {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  flex-shrink: 0;
}

.chart-card__body {
  flex: 1;
  min-height: 0;
  min-width: 0;
}
</style>

