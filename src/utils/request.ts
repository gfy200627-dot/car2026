import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { mockAdapter } from '@/mock'
import { getToken, clearAuth } from './auth'

/**
 * 统一请求层
 * ------------------------------------------------------------
 * - baseURL / token / timeout 统一在这里配置
 * - 页面与 store 只依赖 src/api/*，禁止直接使用 axios
 * - 业务错误码统一转换为 ApiError，401 自动登出并跳转登录页
 */

/**
 * Mock 仅允许在 Vite 开发环境启用。
 * 生产构建（包括 Vercel）无论环境变量如何设置，都强制走真实后端。
 */
export const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' }
})

if (USE_MOCK) {
  // 仅开发环境注入 Mock 适配器，生产环境永远使用真实 HTTP 请求。
  http.defaults.adapter = mockAdapter
}

/** 业务异常 */
export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/* ============================ 请求拦截 ============================ */

http.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers['X-Client'] = 'autoinsight-web'
    return config
  },
  (error) => Promise.reject(error)
)

/* ============================ 响应拦截 ============================ */

/** 401 处理：清除登录态并跳转登录（动态引入 router 避免循环依赖） */
async function handleUnauthorized(message?: string) {
  clearAuth()
  if (message) ElMessage.error(message)
  try {
    const { default: router } = await import('@/router')
    const current = router.currentRoute.value
    if (current.path !== '/login') {
      router.replace({ path: '/login', query: { redirect: current.fullPath } })
    }
  } catch {
    window.location.href = '/login'
  }
}

http.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data
    // 兼容非 envelope 结构（例如后端直出裸数据）
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code === 0) return payload.data
      if (payload.code === 401) {
        void handleUnauthorized(payload.message)
      }
      return Promise.reject(new ApiError(payload.code, payload.message || '请求失败'))
    }
    return payload
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      void handleUnauthorized('登录状态已失效，请重新登录')
      return Promise.reject(new ApiError(401, '登录状态已失效'))
    }
    if (status === 403) {
      return Promise.reject(new ApiError(403, '没有访问该资源的权限'))
    }
    if (status === 404) {
      return Promise.reject(new ApiError(404, '接口不存在'))
    }
    if (status && status >= 500) {
      return Promise.reject(new ApiError(status, '服务暂时不可用，请稍后重试'))
    }
    if (error?.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(-1, '请求超时，请检查网络或后端服务'))
    }
    return Promise.reject(new ApiError(-2, error?.message || '网络异常，请检查后端服务是否已启动'))
  }
)

/* ============================ 对外方法 ============================ */

export interface RequestOptions extends AxiosRequestConfig {
  /** 是否关闭错误提示（由调用方自行处理） */
  silent?: boolean
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const { silent, ...rest } = options
  try {
    return (await http.request(rest)) as T
  } catch (err) {
    if (!silent && err instanceof ApiError) {
      ElMessage.error(err.message)
    }
    throw err
  }
}

export function get<T>(url: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
  return request<T>({ url, method: 'get', params, ...options })
}

export function post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>({ url, method: 'post', data, ...options })
}

export function put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>({ url, method: 'put', data, ...options })
}

export function patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>({ url, method: 'patch', data, ...options })
}

export function del<T>(url: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
  return request<T>({ url, method: 'delete', params, ...options })
}

export { http }
