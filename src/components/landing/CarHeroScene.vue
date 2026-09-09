<template>
  <div ref="host" class="car-hero-scene" aria-hidden="true">
    <div class="car-hero-scene__vignette" />
    <div v-if="loading" class="car-hero-scene__loading">LOADING VEHICLE</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const props = withDefaults(defineProps<{ modelUrl?: string; autoPlay?: boolean }>(), {
  modelUrl: '/models/aventador_svj_black-ghosttm-web-optimized.glb',
  autoPlay: true
})

const host = ref<HTMLDivElement | null>(null)
const loading = ref(true)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let streaks: THREE.Points | null = null
let frame = 0
let observer: ResizeObserver | null = null
let disposed = false
let startedAt = 0
let headlights: THREE.PointLight[] = []

const rearCamera = new THREE.Vector3(5.4, 1.75, -8.4)
const frontCamera = new THREE.Vector3(5.2, 1.05, 8.6)
const target = new THREE.Vector3(1.55, 0.05, 0)
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const out = (t: number) => 1 - Math.pow(1 - t, 3)
const in3 = (t: number) => t * t * t

function setup() {
  if (!host.value) return
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100)
  camera.position.copy(rearCamera)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15))
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  host.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xb8c9dc, 0x030507, 1.15))
  const key = new THREE.DirectionalLight(0xf0f5ff, 3)
  key.position.set(4, 6, -5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x4b8fff, 2.8)
  rim.position.set(-5, 3, 6)
  scene.add(rim)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.72 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.56
  scene.add(floor)
  makeStreaks()
  load()
}

function makeStreaks() {
  if (!scene) return
  const count = 70
  const p = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    p[i * 3] = 1.4 + (Math.random() - 0.5) * 6
    p[i * 3 + 1] = Math.random() * 3.2 - 0.6
    p[i * 3 + 2] = Math.random() * 24 - 10
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  streaks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8ec5ff, size: 0.022, transparent: true, opacity: 0, depthWrite: false }))
  scene.add(streaks)
}

function load() {
  if (!scene) return
  // 模型是 Draco 压缩的 GLB，必须挂 DRACOLoader 才能解析（解码器自托管在 /draco/）
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  loader.load(props.modelUrl, (gltf) => {
    if (disposed || !scene) {
      draco.dispose()
      return
    }
    loading.value = false
    car = gltf.scene
    const box = new THREE.Box3().setFromObject(car)
    const size = box.getSize(new THREE.Vector3())
    car.scale.setScalar(4.1 / Math.max(size.x, size.y, size.z))
    const centered = new THREE.Box3().setFromObject(car).getCenter(new THREE.Vector3())
    car.position.sub(centered)
    car.position.set(1.65, 0.08, 0)
    car.rotation.y = Math.PI
    car.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        const m = mat as THREE.MeshStandardMaterial
        if ('envMapIntensity' in m) m.envMapIntensity = 1.35
        const name = `${obj.name} ${m.name}`.toLowerCase()
        if (/head|lamp|light|led/.test(name) && 'emissive' in m) {
          m.emissive = new THREE.Color(0xffffff)
          m.emissiveIntensity = 0
        }
      })
    })
    const l = new THREE.PointLight(0xdff3ff, 0, 4, 2)
    const r = new THREE.PointLight(0xdff3ff, 0, 4, 2)
    l.position.set(-0.62, 0.28, 1.92)
    r.position.set(0.62, 0.28, 1.92)
    headlights = [l, r]
    headlights.forEach(x => car?.add(x))
    scene.add(car)
    startedAt = performance.now()
    draco.dispose()
  }, undefined, () => { loading.value = false })
}

function headlightsOn(v: number) {
  if (!car) return
  car.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    mats.forEach((mat) => {
      const m = mat as THREE.MeshStandardMaterial
      if (/head|lamp|light|led/.test(`${obj.name} ${m.name}`.toLowerCase()) && 'emissiveIntensity' in m) m.emissiveIntensity = v * 5.5
    })
  })
  headlights.forEach(x => { x.intensity = v * 4.8 })
}

function animate(now: number) {
  if (disposed || !renderer || !scene || !camera) return
  frame = requestAnimationFrame(animate)
  const t = props.autoPlay && startedAt ? Math.max(0, now - startedAt) : 0
  const reveal = smooth(clamp(t / 3000))
  camera.position.copy(rearCamera).lerp(frontCamera, reveal)

  if (car) {
    // 落位：车体整体在标题右侧、车头朝画面右外（侧前 3/4），完整入画
    const launch = in3(clamp((t - 3400) / 1400))
    car.position.x = 1.65 + launch * 2.85
    car.position.y = 0.08
    car.position.z = launch * 3.4
    car.rotation.y = 0.35 + 1.55 * reveal
  }

  headlightsOn(out(clamp((t - 2400) / 500)))
  const launch = clamp((t - 3400) / 1400)
  camera.position.z -= launch * 1.6
  camera.fov = 30 + launch * 2
  camera.lookAt(target)
  camera.updateProjectionMatrix()

  if (streaks) {
    const mat = streaks.material as THREE.PointsMaterial
    mat.opacity = launch * 0.45
    const pos = streaks.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      let z = pos.getZ(i) + 0.18 + launch * 0.5
      if (z > 15) z = -10 - Math.random() * 12
      pos.setZ(i, z)
    }
    pos.needsUpdate = true
  }

  renderer.render(scene, camera)
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 768 ? 1 : 1.15))
}

onMounted(() => {
  setup()
  observer = new ResizeObserver(resize)
  if (host.value) observer.observe(host.value)
  frame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  observer?.disconnect()
  scene?.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.geometry.dispose()
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    mats.forEach(m => m.dispose())
  })
  renderer?.dispose()
  renderer?.domElement.remove()
  headlights = []
  renderer = null
  scene = null
  camera = null
  car = null
  streaks = null
})
</script>

<style scoped>
.car-hero-scene { position:absolute; inset:0; overflow:hidden; pointer-events:none; background:radial-gradient(circle at 70% 48%, rgba(51,101,154,.15), transparent 27%), radial-gradient(circle at 62% 100%, rgba(255,255,255,.05), transparent 38%); }
.car-hero-scene :deep(canvas) { position:absolute; inset:0; width:100%; height:100%; }
.car-hero-scene__vignette { position:absolute; inset:0; background:radial-gradient(circle at 70% 48%, transparent 38%, rgba(0,0,0,.68) 100%); }
.car-hero-scene__loading { position:absolute; right:34px; bottom:28px; z-index:4; color:rgba(255,255,255,.42); font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.18em; }
</style>
