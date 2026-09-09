<template>
  <div ref="host" class="car-hero-scene" aria-hidden="true">
    <div ref="flash" class="car-hero-scene__flash" />
    <div class="car-hero-scene__vignette" />
    <div v-if="loading" class="car-hero-scene__loading">LOADING VEHICLE</div>
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
  modelUrl: '/models/aventador_svj_black-ghosttm-web-optimized.glb',
  autoPlay: true
})

const host = ref<HTMLDivElement | null>(null)
const flash = ref<HTMLDivElement | null>(null)
const error = ref(false)
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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function setupScene() {
  if (!host.value) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100)
  camera.position.set(4.8, 1.75, -7.2)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(host.value.clientWidth, host.value.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.shadowMap.enabled = false
  host.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xb8c9dc, 0x030507, 1.35))

  const key = new THREE.DirectionalLight(0xf0f5ff, 3.8)
  key.position.set(4, 6, -5)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x4b8fff, 4.2)
  rim.position.set(-5, 3, 6)
  scene.add(rim)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.7 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.56
  scene.add(floor)

  createStreaks()
  loadCar()
}

function createStreaks() {
  if (!scene) return

  const positions = new Float32Array(160 * 3)
  for (let i = 0; i < 160; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 11
    positions[i * 3 + 1] = Math.random() * 4.5 - 1
    positions[i * 3 + 2] = Math.random() * 22 - 8
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x8ec5ff,
    size: 0.03,
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

      // The source model already uses Y-up with the vehicle nose toward +Z.
      // Keep the source orientation so the rear camera can move naturally to the front.
      car.rotation.set(0, 0, 0)

      const bounds = new THREE.Box3().setFromObject(car)
      const size = bounds.getSize(new THREE.Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)
      const target = 4.65
      car.scale.setScalar(target / maxDimension)

      const centeredBounds = new THREE.Box3().setFromObject(car)
      const center = centeredBounds.getCenter(new THREE.Vector3())
      car.position.sub(center)
      car.position.y += 0.12

      car.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.frustumCulled = true

        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const standard = material as THREE.MeshStandardMaterial
          if ('envMapIntensity' in standard) standard.envMapIntensity = 1.65
          if ('roughness' in standard) standard.roughness = Math.min(0.48, standard.roughness ?? 0.48)
          if ('metalness' in standard) standard.metalness = Math.max(0.55, standard.metalness ?? 0.55)

          const name = `${object.name} ${material.name}`.toLowerCase()
          if (/head|lamp|light|led/.test(name) && 'emissive' in standard) {
            standard.emissive = new THREE.Color(0xffffff)
            standard.emissiveIntensity = 0
          }
        })
      })

      // Two small forward-facing light sources make the headlight ignition visible
      // even though the web model intentionally has no large texture payload.
      const leftHeadlight = new THREE.PointLight(0xdff3ff, 0, 3.8, 2)
      leftHeadlight.position.set(-0.68, 0.32, 2.08)
      const rightHeadlight = new THREE.PointLight(0xdff3ff, 0, 3.8, 2)
      rightHeadlight.position.set(0.68, 0.32, 2.08)
      headlights = [leftHeadlight, rightHeadlight]
      headlights.forEach((light) => car?.add(light))

      scene.add(car)
      startedAt = performance.now()
    },
    undefined,
    () => {
      loading.value = false
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
        standard.emissiveIntensity = intensity * 6
      }
    })
  })

  headlights.forEach((light) => {
    light.intensity = intensity * 4.5
  })
}

function animate(now: number) {
  if (disposed || !renderer || !scene || !camera) return
  animationFrame = requestAnimationFrame(animate)

  const elapsed = props.autoPlay ? Math.max(0, now - startedAt) : 0

  // 0.0s - 2.6s: rear 3/4 camera move to front 3/4.
  // 2.6s - 3.6s: straight launch. No extra car rotation, so there is no side ghost.
  const orbit = clamp01(elapsed / 2600)
  const launch = clamp01((elapsed - 2600) / 1000)
  const orbitEase = easeInOutCubic(orbit)
  const launchEase = easeInOutCubic(launch)

  if (car) {
    car.position.z = launchEase * 3.0
    car.position.y = 0.12 + Math.sin(elapsed * 0.0018) * 0.009
  }

  const rear = new THREE.Vector3(4.8, 1.75, -7.2)
  const front = new THREE.Vector3(3.55, 1.58, 6.8)
  camera.position.copy(rear.lerp(front, orbitEase))

  // During launch the camera retreats while the vehicle advances toward it.
  camera.position.z += launchEase * 4.8
  camera.position.x += launchEase * 0.7
  camera.position.y += launchEase * 0.18

  const look = new THREE.Vector3(0, 0.1, launchEase * 1.0)
  camera.lookAt(look)
  camera.fov = 30 + launchEase * 5
  camera.updateProjectionMatrix()

  updateHeadlights(clamp01((elapsed - 2050) / 400))

  if (streaks) {
    const material = streaks.material as THREE.PointsMaterial
    material.opacity = launchEase * 0.65
    const positions = streaks.geometry.getAttribute('position') as THREE.BufferAttribute

    for (let i = 0; i < positions.count; i += 1) {
      let z = positions.getZ(i) + launchEase * (0.22 + (i % 5) * 0.055)
      if (z > 14) z = -8 - Math.random() * 10
      positions.setZ(i, z)
    }

    positions.needsUpdate = true
  }

  if (flash.value) {
    const flashIn = clamp01((elapsed - 3450) / 110)
    const flashOut = clamp01((elapsed - 3560) / 260)
    flash.value.style.opacity = String(Math.max(0, flashIn - flashOut))
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.15 : 1.5))
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
  background: radial-gradient(circle at 55% 48%, transparent 38%, rgba(0,0,0,.68) 100%);
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
  color: rgba(255,255,255,.45);
  font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .18em;
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
