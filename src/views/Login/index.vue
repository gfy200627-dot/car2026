<template>
  <div class="login">
    <!-- 左侧：品牌视觉区 -->
    <section class="login__visual">
      <div class="login__visual-bg" />
      <div class="login__visual-content">
        <div class="login__logo">
          <span class="login__logo-mark">AI</span>
          <div class="login__logo-text">
            <b>AutoInsight</b>
            <em>汽车行业数据智能分析与决策平台</em>
          </div>
        </div>

        <h1 class="login__slogan">
          从行业数据<br />到经营决策
        </h1>
        <p class="login__desc">
          覆盖市场分析、用户画像、智能购车推荐、销量预测与企业经营驾驶舱，
          为汽车行业提供一体化数据智能能力。
        </p>

        <ul class="login__features">
          <li>
            <el-icon><DataLine /></el-icon>
            <span>全国销量与新能源渗透率实时监测</span>
          </li>
          <li>
            <el-icon><MagicStick /></el-icon>
            <span>多因子加权的智能购车推荐引擎</span>
          </li>
          <li>
            <el-icon><TrendCharts /></el-icon>
            <span>XGBoost 时序模型销量预测与置信区间</span>
          </li>
          <li>
            <el-icon><DataBoard /></el-icon>
            <span>企业经营数据驾驶舱与后台管理</span>
          </li>
        </ul>

        <div class="login__stats">
          <div v-for="s in stats" :key="s.label">
            <b class="ai-num">{{ s.value }}</b>
            <span>{{ s.label }}</span>
          </div>
        </div>
      </div>

      <p class="login__visual-foot">示例数据环境 · 数据更新时间：模拟</p>
    </section>

    <!-- 右侧：登录卡片 -->
    <section class="login__panel">
      <div class="login__card">
        <header class="login__card-head">
          <h2>账号登录</h2>
          <p>请使用企业账号登录 AutoInsight 平台</p>
        </header>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="onSubmit">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              clearable
            />
          </el-form-item>

          <el-form-item prop="captcha">
            <div class="login__captcha">
              <el-input v-model="form.captcha" placeholder="验证码（后端未启用时可留空）" :prefix-icon="Key" />
              <div class="login__captcha-img" title="验证码由后端提供">
                <span class="ai-num">{{ captchaText }}</span>
              </div>
            </div>
          </el-form-item>

          <div class="login__row">
            <el-checkbox v-model="form.remember">记住登录状态</el-checkbox>
            <el-button link type="primary" @click="ElMessage.info('请联系系统管理员重置密码')">忘记密码？</el-button>
          </div>

          <el-button type="primary" class="login__submit" :loading="loading" @click="onSubmit">
            {{ loading ? '登录中…' : '登 录' }}
          </el-button>
        </el-form>

        <div class="login__demo">
          <div class="login__demo-head">
            <span class="ai-tag ai-tag--mock">演示账号</span>
            <span class="login__demo-hint">点击任意账号快速填充</span>
          </div>
          <div class="login__demo-list">
            <button
              v-for="acc in demoAccounts"
              :key="acc.username"
              type="button"
              class="login__demo-item"
              @click="fillAccount(acc)"
            >
              <b>{{ acc.username }}</b>
              <span>{{ acc.desc }}</span>
            </button>
          </div>
        </div>

        <p class="login__foot">
          登录即表示同意《平台使用协议》与《数据保密协议》
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { DataBoard, DataLine, Key, Lock, MagicStick, TrendCharts, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { roleHome } from '@/router'
import type { LoginPayload } from '@/types'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const ElMessageRef = ElMessage

const formRef = ref<FormInstance>()
const loading = ref(false)

/** 演示账号（真实环境由后端账号体系提供） */
const demoAccounts: { username: string; password: string; desc: string }[] = [
  { username: 'admin', password: 'admin123', desc: '系统管理员 · 全部权限' },
  { username: 'analyst', password: 'analyst123', desc: '数据分析师 · 分析与预测' },
  { username: 'sales', password: 'sales123', desc: '销售运营 · 车型与订单' },
  { username: 'user', password: 'user123', desc: '普通用户 · 浏览与推荐' }
]

const form = reactive<LoginPayload & { captcha: string }>({
  username: 'admin',
  password: 'admin123',
  remember: true,
  captcha: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const captchaText = ref(randomCaptcha())

function randomCaptcha(): string {
  const chars = 'ACDEFHJKLMNPQRTUVWXY34678'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function fillAccount(acc: { username: string; password: string }): void {
  form.username = acc.username
  form.password = acc.password
  ElMessageRef.success(`已填充演示账号：${acc.username}`)
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const user = await userStore.login({
      username: form.username,
      password: form.password,
      remember: form.remember,
      captcha: form.captcha
    })
    ElMessageRef.success(`欢迎回来，${user.nickname}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || roleHome(user.role))
  } catch (e) {
    ElMessageRef.error(e instanceof Error ? e.message : '登录失败，请重试')
    captchaText.value = randomCaptcha()
  } finally {
    loading.value = false
  }
}

const stats = [
  { label: '覆盖品牌', value: '30+' },
  { label: '在售车型', value: '158' },
  { label: '历史月份', value: '24' },
  { label: '省级区域', value: '34' }
]
</script>

<style scoped lang="scss">
.login {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 40px;
  width: min(100%, 1280px);
  max-width: 1280px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--ai-bg-base);
}

/* ---------- 左侧视觉区 ---------- */
.login__visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: var(--ai-space-10) 0 var(--ai-space-10) var(--ai-space-10);
  overflow: hidden;
  background: var(--ai-bg-page);
  border-right: 1px solid var(--ai-border);
}

.login__visual-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 520px at 10% 0%, rgba(46, 124, 246, 0.16), transparent 62%),
    radial-gradient(700px 460px at 88% 78%, rgba(22, 199, 154, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  pointer-events: none;
}

.login__visual-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 30% 30%, #000 0%, transparent 72%);
}

.login__visual-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 540px;
  min-width: 0;
  margin-left: auto;
  text-align: left;
}

.login__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.login__logo-mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--ai-brand), var(--ai-nev));
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 30px rgba(46, 124, 246, 0.3);
}

.login__logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;

  b { font-size: 18px; letter-spacing: 0.01em; }
  em { font-style: normal; font-size: 13px; color: var(--ai-text-4); margin-top: 2px; overflow-wrap: anywhere; }
}

.login__slogan {
  margin-top: 48px;
  font-size: 42px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: var(--ai-text-1);
}

.login__desc {
  margin-top: 18px;
  font-size: 15px;
  color: var(--ai-text-2);
  line-height: var(--ai-lh-loose);
  max-width: 480px;
}

.login__features {
  margin-top: 32px;
  display: grid;
  gap: 14px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    font-size: 14px;
    color: var(--ai-text-2);

    span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }

  .el-icon { flex: 0 0 auto; color: var(--ai-brand); font-size: 16px; }
}

.login__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ai-space-4);
  margin-top: 40px;
  padding-top: var(--ai-space-5);
  border-top: 1px solid var(--ai-border);

  div {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 4px;
  }

  b { font-size: 22px; color: var(--ai-text-1); font-weight: 600; }
  span { font-size: var(--ai-fs-sm); color: var(--ai-text-4); overflow-wrap: anywhere; }
}

.login__visual-foot {
  position: relative;
  z-index: 1;
  margin-top: var(--ai-space-8);
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-4);
}

/* ---------- 右侧登录区 ---------- */
.login__panel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  padding: var(--ai-space-8) var(--ai-space-10) var(--ai-space-8) 0;
}

.login__card {
  width: 100%;
  min-width: 0;
  max-width: 440px;
}

.login__card-head {
  margin-bottom: var(--ai-space-6);

  h2 {
    font-size: var(--ai-fs-h1);
    font-weight: 600;
    color: var(--ai-text-1);
  }

  p {
    margin-top: 8px;
    font-size: var(--ai-fs-body);
    color: var(--ai-text-3);
  }
}

.login__captcha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: var(--ai-space-2);
  width: 100%;
  min-width: 0;
}

.login__captcha-img {
  display: grid;
  place-items: center;
  min-width: 0;
  border: 1px dashed var(--ai-border-dashed);
  border-radius: var(--ai-radius-sm);
  background: var(--ai-bg-subtle);
  color: var(--ai-text-3);
  font-size: 18px;
  letter-spacing: 0.32em;
  user-select: none;
  cursor: pointer;
  transition: border-color var(--ai-duration-base) var(--ai-ease);

  &:hover { border-color: var(--ai-brand); }
}

.login__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: var(--ai-space-5);

  .el-checkbox,
  .el-button {
    min-width: 0;
  }
}

.login__submit {
  width: 100%;
  height: 44px;
  font-size: var(--ai-fs-body);
  letter-spacing: 0.16em;
}

.login__demo {
  margin-top: var(--ai-space-6);
  padding: var(--ai-space-4);
  border: 1px dashed var(--ai-border-dashed);
  border-radius: var(--ai-radius-md);
  background: var(--ai-bg-subtle);
}

.login__demo-head {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  min-width: 0;
  margin-bottom: 10px;
}

.login__demo-hint {
  min-width: 0;
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-4);
  overflow-wrap: anywhere;
}

.login__demo-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.login__demo-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
  padding: 10px 12px;
  border-radius: var(--ai-radius-sm);
  border: 1px solid var(--ai-border);
  background: var(--ai-bg-panel);
  cursor: pointer;
  text-align: left;
  transition: all var(--ai-duration-base) var(--ai-ease);

  b { font-size: var(--ai-fs-sm); color: var(--ai-text-1); }
  span { font-size: 12px; color: var(--ai-text-4); overflow-wrap: anywhere; }

  &:hover {
    border-color: var(--ai-border-brand);
    background: var(--ai-brand-ghost);
  }
}

.login__foot {
  margin-top: var(--ai-space-5);
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-4);
  text-align: center;
  line-height: 1.6;
}

/* 1280 以下改为单列登录页，避免左右两栏在常见笔记本宽度下互相挤压 */
@media (max-width: 1280px) {
  .login {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    max-width: none;
    gap: 0;
  }
  .login__visual { display: none; }
  .login__panel {
    min-height: 100vh;
    justify-content: center;
    padding: clamp(24px, 5vh, 48px) clamp(20px, 4vw, 48px);
  }
  .login__card { max-width: 420px; }
}

/* 短屏优先处理，避免 1366×768 / 1280×720 下卡片底部被截断 */
@media (max-height: 820px) and (min-width: 769px) {
  .login__panel {
    align-items: flex-start;
    min-height: 100vh;
    padding-top: 32px;
    padding-bottom: 32px;
    overflow-y: auto;
  }

  .login__card-head { margin-bottom: 18px; }
  .login__demo { margin-top: 18px; }
  .login__foot { margin-top: 14px; }
}

@media (max-width: 600px) {
  .login__panel {
    min-height: 100dvh;
    padding: 24px 16px;
  }

  .login__card-head {
    margin-bottom: 20px;

    h2 { font-size: 26px; }
    p { font-size: 13px; }
  }

  .login__captcha {
    grid-template-columns: minmax(0, 1fr) 96px;
  }

  .login__row {
    align-items: flex-start;
  }

  .login__demo {
    padding: 12px;
  }

  .login__demo-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 380px) {
  .login__panel { padding-inline: 12px; }
  .login__captcha { grid-template-columns: minmax(0, 1fr) 88px; }
  .login__row { flex-wrap: wrap; }
}
</style>
