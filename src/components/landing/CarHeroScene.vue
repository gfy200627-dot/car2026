<template>
  <div ref="host" class="car-hero-scene" aria-hidden="true">
    <div ref="flash" class="car-hero-scene__flash" />
    <div class="car-hero-scene__vignette" />
    <div v-if="loading" class="car-hero-scene__loading">LOADING VEHICLE</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = withDefaults(defineProps<{ modelUrl?: string; autoPlay?: boolean }>(), {
  modelUrl: '/models/aventador_svj_black-ghosttm-web-optimized.glb',
  autoPlay: true
})

const host = ref<HTMLDivElement | null>(null)
const flash = ref<HTMLDivElement | null>(null)
const loading = ref(true)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let streaks: THREE.Points | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let disposed = false
let startedAt = 0
let headlights: THREE.PointLight[] = []

const clock = new THREE.Clock()
const rearCamera = new THREE.Vector3(4.8, 1.72, -7.4)
const frontCamera = new THREE.Vector3(3.15, 1.48, 5.8)
const target = new THREE.Vector3(0, 0.08, 0)

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function setupScene() {
  if (!host.value) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(31, 1, 0.05, 100)
  camera.position.copy(rearCamera)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = false
  host.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xb8c9dc, 0x030507, 1.2))

  const key = new THREE.DirectionalLight(0xf0f5ff, 3.4)
  key.position.set(4, 6, -5)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x4b8fff, 3.2)
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
  const count = 110
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = Math.random() * 4.2 - 0.9
    positions[i * 3 + 2] = Math.random() * 22 - 8
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x8ec5ff,
    size: 0.026,
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

      loading.value = false
      car = gltf.scene
      car.rotation.set(0, 0, 0)

      const bounds = new THREE.Box3().setFromObject(car)
      const size = bounds.getSize(new THREE.Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)
      const targetLength = 4.2
      car.scale.setScalar(targetLength / maxDimension)

      const centeredBounds = new THREE.Box3().setFromObject(car)
      const center = centeredBounds.getCenter(new THREE.Vector3())
      car.position.sub(center)
      car.position.y += 0.08

      car.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.frustumCulled = true
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const standard = material as THREE.MeshStandardMaterial
          if ('envMapIntensity' in standard) standard.envMapIntensity = 1.45
          if ('roughness' in standard) standard.roughness = Math.min(0.5, standard.roughness ?? 0.5)
          if ('metalness' in standard) standard.metalness = Math.max(0.5, standard.metalness ?? 0.5)

          const name = `${object.name} ${material.name}`.toLowerCase()
          if (/head|lamp|light|led/.test(name) && 'emissive' in standard) {
            standard.emissive = new THREE.Color(0xffffff)
            standard.emissiveIntensity = 0
          }
        })
      })

      const left = new THREE.PointLight(0xdff3ff, 0, 3.6, 2)
      left.position.set(-0.62, 0.28, 1.92)
      const right = new THREE.PointLight(0xdff3ff, 0, 3.6, 2)
      right.position.set(0.62, 0.28, 1.92)
      headlights = [left, right]
      headlights.forEach((light) => car?.add(light))

      scene.add(car)

      // Start the timeline only after the GLB has actually loaded.
      // This prevents the animation from silently finishing while the model is downloading.
      startedAt = performance.now()
    },
    undefined,
    () => {
      loading.value = false
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
        standard.emissiveIntensity = intensity * 5.5
      }
    })
  })
  headlights.forEach((light) => { light.intensity = intensity * 4.2 })
}

function animate(now: number) {
  if (disposed || !renderer || !scene || !camera) return
  animationFrame = requestAnimationFrame(animate)

  // The intro is deliberately long enough to be visible after the model finishes loading.
  const elapsed = props.autoPlay && startedAt ? Math.max(0, now - startedAt) : 0

  // 0.0 - 3.4s: camera makes a clean rear-3/4 -> front-3/4 sweep.
  const orbit = easeInOutCubic(clamp01(elapsed / 3400))
  camera.position.copy(rearCamera).lerp(frontCamera, orbit)

  // Keep the car visually centered in the open right half of the Hero.
  if (car) {
    const launch = easeOutCubic(clamp01((elapsed - 3400) / 1700))
    car.position.x = launch * 0.55
    car.position.z = launch * 2.0
    car.position.y = 0.08 + Math.sin(elapsed * 0.0016) * 0.006

    // A tiny steering-like yaw while the camera completes the reveal.
    car.rotation.y = Math.sin(orbit * Math.PI) * -0.035
  }

  const launch = clamp01((elapsed - 3400) / 1700)
  camera.position.z += launch * 3.5
  camera.position.x += launch * 0.35
  camera.fov = 31 + launch * 4
  camera.lookAt(target)
  camera.updateProjectionMatrix()

  // Headlights ignite just before the reveal reaches the front.
  updateHeadlights(clamp01((elapsed - 2550) / 450))

  if (streaks) {
    const material = streaks.material as THREE.PointsMaterial
    material.opacity = launch * 0.48
    const positions = streaks.geometry.getAttribute('position') as THREE.BufferAttribute
    const speed = 0.12 + launch * 0.22
    for (let i = 0; i < positions.count; i += 1) {
      let z = positions.getZ(i) + speed
      if (z > 14) z = -8 - Math.random() * 9
      positions.setZ(i, z)
    }
    positions.needsUpdate = true
  }

  if (flash.value) {
    const flashIn = clamp01((elapsed - 4920) / 120)
    const flashOut = clamp01((elapsed - 5040) / 420)
    flash.value.style.opacity = String(Math.max(0, flashIn * (1 - flashOut)))
  }

  renderer.render(scene, camera)
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const width = host.value.clientWidth
  const height = host.value.clientHeight
  if (!width || !height) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.05 : 1.25))
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
    materials.forEach((material) => material.dispose())
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
    radial-gradient(circle at 64% 48%, rgba(51, 101, 154, 0.16), transparent 28%),
    radial-gradient(circle at 52% 100%, rgba(255,255,255,0.05), transparent 38%);
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
  background: radial-gradient(circle at 57% 48%, transparent 40%, rgba(0,0,0,.62) 100%);
}

.car-hero-scene__flash {
  position: absolute;
  inset: -10%;
  z-index: 5;
  background: #fff;
  opacity: 0;
  mix-blend-mode: screen;
}

.car-hero-scene__loading {
  position: absolute;
  right: 34px;
  bottom: 28px;
  z-index: 4;
  color: rgba(255,255,255,.42);
  font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .18em;
}
</style>
