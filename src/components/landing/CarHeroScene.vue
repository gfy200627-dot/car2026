<template>
  <div ref="host" class="car-hero-scene" aria-hidden="true">
    <div ref="flash" class="car-hero-scene__flash" />
    <div class="car-hero-scene__vignette" />
    <div v-if="error" class="car-hero-scene__fallback">
      <span>AUTOINSIGHT</span>
      <small>3D VEHICLE SCENE</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = withDefaults(defineProps<{
  modelUrl?: string
  autoPlay?: boolean
}>(), {
  modelUrl: '/models/aventador_svj_black-ghosttm.glb',
  autoPlay: true
})

const host = ref<HTMLDivElement | null>(null)
const flash = ref<HTMLDivElement | null>(null)
const error = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let streaks: THREE.Points | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let disposed = false
let startedAt = 0
let headlights: THREE.Light[] = []

const clock = new THREE.Clock()
const MODEL_YAW = Math.PI

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function setupScene() {
  if (!host.value) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
  camera.position.set(5.2, 2.25, -7.2)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = false
  host.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0x9fb7d5, 0x030507, 1.2))

  const key = new THREE.DirectionalLight(0xd8e8ff, 3.4)
  key.position.set(4, 7, -5)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x3c86ff, 4.5)
  rim.position.set(-5, 3, 6)
  scene.add(rim)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.72 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.56
  scene.add(floor)

  createStreaks()
  loadCar()
}

function createStreaks() {
  if (!scene) return
  const positions = new Float32Array(240 * 3)
  for (let i = 0; i < 240; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 12
    positions[i * 3 + 1] = Math.random() * 5 - 1.2
    positions[i * 3 + 2] = Math.random() * 24 - 8
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x8ec5ff,
    size: 0.035,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
  streaks = new THREE.Points(geometry, material)
  scene.add(streaks)
}

function loadCar() {
  if (!scene) return
  const loader = new GLTFLoader()
  loader.load(
    props.modelUrl,
    (gltf) => {
      if (disposed || !scene) return
      car = gltf.scene
      car.rotation.y = MODEL_YAW

      const bounds = new THREE.Box3().setFromObject(car)
      const size = bounds.getSize(new THREE.Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)
      const target = 5.2
      car.scale.setScalar(target / maxDimension)

      const centeredBounds = new THREE.Box3().setFromObject(car)
      const center = centeredBounds.getCenter(new THREE.Vector3())
      car.position.sub(center)
      car.position.y += 0.18

      car.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.frustumCulled = true
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const standard = material as THREE.MeshStandardMaterial
          if ('envMapIntensity' in standard) standard.envMapIntensity = 1.8
          if ('roughness' in standard) standard.roughness = Math.min(0.42, standard.roughness ?? 0.42)
          if ('metalness' in standard) standard.metalness = Math.max(0.5, standard.metalness ?? 0.5)

          const name = `${object.name} ${material.name}`.toLowerCase()
          if (/head|lamp|light|led/.test(name) && 'emissive' in standard) {
            standard.emissive = new THREE.Color(0xffffff)
            standard.emissiveIntensity = 0
            headlights.push(new THREE.PointLight(0xeaf6ff, 0, 4.5, 2))
          }
        })
      })

      scene.add(car)
      startedAt = performance.now()
      if (!props.autoPlay) startedAt = performance.now() + 4000
    },
    undefined,
    () => {
      error.value = true
    }
  )
}

function updateHeadlights(intensity: number) {
  if (!car) return
  car.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      const standard = material as THREE.MeshStandardMaterial
      const name = `${object.name} ${material.name}`.toLowerCase()
      if (/head|lamp|light|led/.test(name) && 'emissiveIntensity' in standard) {
        standard.emissiveIntensity = intensity * 7
      }
    })
  })
  headlights.forEach((light) => { light.intensity = intensity * 5 })
}

function animate(now: number) {
  if (disposed || !renderer || !scene || !camera) return
  animationFrame = requestAnimationFrame(animate)

  const elapsed = props.autoPlay ? now - startedAt : 0
  const idle = elapsed < 0
  const intro = idle ? 0 : clamp01(elapsed / 2200)
  const ignition = clamp01((elapsed - 1900) / 650)
  const launch = clamp01((elapsed - 2450) / 1050)
  const launchEase = easeInOutCubic(launch)

  if (car) {
    const baseZ = 0
    car.position.z = baseZ + launchEase * 3.7
    car.position.y = 0.18 + Math.sin(elapsed * 0.0018) * 0.012
    car.rotation.y = MODEL_YAW + Math.sin(elapsed * 0.0006) * 0.012
  }

  const rear = new THREE.Vector3(5.2, 2.25, -7.2)
  const front = new THREE.Vector3(3.35, 1.72, 7.2)
  const orbitT = easeInOutCubic(intro)
  const cameraPos = rear.lerp(front, orbitT)
  camera.position.copy(cameraPos)

  const pullback = launchEase * 4.4
  camera.position.z += pullback
  camera.position.x += launchEase * 1.15
  camera.position.y += launchEase * 0.25

  const look = new THREE.Vector3(0, 0.15, launchEase * 1.4)
  camera.lookAt(look)
  camera.fov = 32 + launchEase * 7
  camera.updateProjectionMatrix()

  updateHeadlights(ignition)

  if (streaks) {
    const material = streaks.material as THREE.PointsMaterial
    material.opacity = launchEase * 0.9
    const positions = streaks.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < positions.count; i += 1) {
      let z = positions.getZ(i) + launchEase * (0.32 + (i % 5) * 0.08)
      if (z > 14) z = -8 - Math.random() * 12
      positions.setZ(i, z)
    }
    positions.needsUpdate = true
  }

  if (flash.value) {
    const flashT = clamp01((elapsed - 3300) / 170)
    const fadeT = clamp01((elapsed - 3470) / 240)
    const opacity = Math.max(0, flashT - fadeT)
    flash.value.style.opacity = String(opacity)
  }

  renderer.render(scene, camera)
  clock.getDelta()
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const width = host.value.clientWidth
  const height = host.value.clientHeight
  if (!width || !height) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.25 : 1.75))
}

onMounted(() => {
  setupScene()
  resizeObserver = new ResizeObserver(resize)
  if (host.value) resizeObserver.observe(host.value)
  animationFrame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  resizeObserver = null
  headlights = []

  scene?.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose()
      })
      material.dispose()
    })
  })

  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  scene = null
  camera = null
  car = null
  streaks = null
})
</script>

<style scoped>
.car-hero-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 62% 48%, rgba(51, 101, 154, 0.18), transparent 28%),
    radial-gradient(circle at 50% 100%, rgba(255,255,255,0.06), transparent 38%);
}
.car-hero-scene :deep(canvas) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.car-hero-scene__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 55% 48%, transparent 32%, rgba(0,0,0,.72) 100%);
}
.car-hero-scene__flash {
  position: absolute;
  inset: -10%;
  z-index: 5;
  background: #fff;
  opacity: 0;
  mix-blend-mode: screen;
}
.car-hero-scene__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  color: rgba(255,255,255,.3);
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .18em;
}
.car-hero-scene__fallback span { font-size: 11px; }
.car-hero-scene__fallback small { font-size: 8px; color: rgba(255,255,255,.18); }
</style>
