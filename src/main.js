import * as THREE from 'three'
import GUI from 'lil-gui'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// ── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color('#0a0f2a')
scene.fog = new THREE.FogExp2('#0a0f2a', 0.04)

// ── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

// ── Camera helpers ────────────────────────────────────────────────────────────
function focalLengthToFov(mm) {
  return 2 * Math.atan(24 / (2 * mm)) * (180 / Math.PI)
}

let theta  = 0
let phi    = Math.PI / 4
let radius = 300
let pivotY    = 0
let pivotYMin = -500
let pivotYMax =  500

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000)

function updateCamera() {
  camera.position.set(
    radius * Math.sin(phi) * Math.cos(theta),
    pivotY + radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
  camera.lookAt(0, pivotY, 0)
}
updateCamera()

// §PARAMS_START — 此區塊由 GUI「儲存至 main.js」按鈕自動更新，請勿手動改格式
const params = {
  focalLength: 56.181817787737884,
  ambientIntensity: 0,
  keyLightIntensity: 4,
  keyLightColor: '#ff7b00',
  fillLightIntensity: 0.35,
  fillLightColor: '#009dff',
  neonCyan1Intensity: 0,
  neonCyan1Color: '#00ffaa',
  neonPinkIntensity: 0,
  neonPinkColor: '#ff006f',
  neonCyan2Intensity: 0,
  neonCyan2Color: '#00ffaa',
  bloomStrength: 0.55,
  bloomRadius: 0.83,
  bloomThreshold: 0.07,
}

// 套用 params 初始值
camera.fov = focalLengthToFov(params.focalLength)
camera.updateProjectionMatrix()

// ── Lighting（從 params 初始化）──────────────────────────────────────────────
const ambient = new THREE.AmbientLight('#1a0f1a', params.ambientIntensity)
scene.add(ambient)

const keyLight = new THREE.DirectionalLight(params.keyLightColor, params.keyLightIntensity)
keyLight.position.set(50, 20, -10)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.near = 1
keyLight.shadow.camera.far  = 1200
keyLight.shadow.camera.left   = -300
keyLight.shadow.camera.right  =  300
keyLight.shadow.camera.top    =  300
keyLight.shadow.camera.bottom = -300
scene.add(keyLight)

const dirLight = new THREE.DirectionalLight(params.fillLightColor, params.fillLightIntensity)
dirLight.position.set(80, 100, 60)
dirLight.castShadow = false
scene.add(dirLight)

const neonCyan1 = new THREE.PointLight(params.neonCyan1Color, params.neonCyan1Intensity, 300)
neonCyan1.position.set(-80, 30, 60)
scene.add(neonCyan1)

const neonPink = new THREE.PointLight(params.neonPinkColor, params.neonPinkIntensity, 300)
neonPink.position.set(60, -20, -80)
scene.add(neonPink)

const neonCyan2 = new THREE.PointLight(params.neonCyan2Color, params.neonCyan2Intensity, 250)
neonCyan2.position.set(20, 80, 80)
scene.add(neonCyan2)

// ── Post-processing（從 params 初始化）───────────────────────────────────────
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  params.bloomStrength,
  params.bloomRadius,
  params.bloomThreshold
)
composer.addPass(bloomPass)
composer.addPass(new OutputPass())

// ── GUI ───────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Scene Controls', width: 280 })

// 儲存按鈕：把當前 params 寫回 src/main.js
let saveCtrl
const saveActions = {
  save: async () => {
    saveCtrl.name('儲存中...')
    try {
      const res = await fetch('/api/save-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      saveCtrl.name(data.ok ? '✓ 已儲存' : '✗ 失敗')
    } catch {
      saveCtrl.name('✗ 連線失敗')
    }
    setTimeout(() => saveCtrl.name('💾 儲存至 main.js'), 2000)
  },
}
saveCtrl = gui.add(saveActions, 'save').name('💾 儲存至 main.js')

// 攝影機（radius 不寫入 params，由 FBX 載入後計算）
const camProxy = { radius }
const camFolder = gui.addFolder('攝影機')
const radiusCtrl = camFolder.add(camProxy, 'radius', 50, 5000, 1)
  .name('遠近距離')
  .onChange(v => { radius = v; updateCamera() })
const focalCtrl = camFolder.add(params, 'focalLength', 14, 400, 1)
  .name('焦距 (mm)')
  .onChange(v => { camera.fov = focalLengthToFov(v); camera.updateProjectionMatrix() })

// 主要燈光
const lightFolder = gui.addFolder('主要燈光')
lightFolder.add(params, 'ambientIntensity', 0, 2, 0.01)
  .name('環境光強度')
  .onChange(v => { ambient.intensity = v })
lightFolder.add(params, 'keyLightIntensity', 0, 6, 0.05)
  .name('Key Light 強度')
  .onChange(v => { keyLight.intensity = v })
lightFolder.addColor(params, 'keyLightColor')
  .name('Key Light 顏色')
  .onChange(v => { keyLight.color.set(v) })
lightFolder.add(params, 'fillLightIntensity', 0, 3, 0.05)
  .name('Fill Light 強度')
  .onChange(v => { dirLight.intensity = v })
lightFolder.addColor(params, 'fillLightColor')
  .name('Fill Light 顏色')
  .onChange(v => { dirLight.color.set(v) })

// 霓虹燈
const neonFolder = gui.addFolder('霓虹燈')
neonFolder.add(params, 'neonCyan1Intensity', 0, 15, 0.1)
  .name('青綠 1 強度')
  .onChange(v => { neonCyan1.intensity = v })
neonFolder.addColor(params, 'neonCyan1Color')
  .name('青綠 1 顏色')
  .onChange(v => { neonCyan1.color.set(v) })
neonFolder.add(params, 'neonPinkIntensity', 0, 15, 0.1)
  .name('霓虹粉 強度')
  .onChange(v => { neonPink.intensity = v })
neonFolder.addColor(params, 'neonPinkColor')
  .name('霓虹粉 顏色')
  .onChange(v => { neonPink.color.set(v) })
neonFolder.add(params, 'neonCyan2Intensity', 0, 15, 0.1)
  .name('青綠 2 強度')
  .onChange(v => { neonCyan2.intensity = v })
neonFolder.addColor(params, 'neonCyan2Color')
  .name('青綠 2 顏色')
  .onChange(v => { neonCyan2.color.set(v) })

// Bloom
const bloomFolder = gui.addFolder('Bloom')
bloomFolder.add(params, 'bloomStrength', 0, 3, 0.01)
  .name('強度')
  .onChange(v => { bloomPass.strength = v })
bloomFolder.add(params, 'bloomRadius', 0, 1, 0.01)
  .name('擴散範圍')
  .onChange(v => { bloomPass.radius = v })
bloomFolder.add(params, 'bloomThreshold', 0, 1, 0.01)
  .name('閾值（越小越多發光）')
  .onChange(v => { bloomPass.threshold = v })

// ── FBX Loader ───────────────────────────────────────────────────────────────
const loadingEl  = document.getElementById('loading')
const loadingBar = document.getElementById('loading-bar')
const loadingTxt = document.getElementById('loading-text')

const loader = new FBXLoader()
loader.load(
  '/Demo_Sences.fbx',

  (fbx) => {
    const box    = new THREE.Box3().setFromObject(fbx)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())

    fbx.position.sub(center)
    scene.add(fbx)

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true
        child.receiveShadow = true
      }
    })

    const maxDim = Math.max(size.x, size.y, size.z)
    radius = maxDim * 1.2
    camProxy.radius = radius

    camera.near = radius * 0.001
    camera.far  = radius * 20
    camera.updateProjectionMatrix()

    pivotYMin = -size.y / 2
    pivotYMax =  size.y / 2
    updateCamera()

    radiusCtrl.min(radius * 0.2).max(radius * 4).updateDisplay()

    const hw = size.x * 0.7
    const hh = size.y * 0.7
    keyLight.shadow.camera.left   = -hw
    keyLight.shadow.camera.right  =  hw
    keyLight.shadow.camera.top    =  hh
    keyLight.shadow.camera.bottom = -hh
    keyLight.shadow.camera.updateProjectionMatrix()

    neonCyan1.position.set(-size.x * 0.3,  size.y * 0.1,  size.z * 0.4)
    neonPink.position.set(  size.x * 0.3, -size.y * 0.1, -size.z * 0.4)
    neonCyan2.position.set( size.x * 0.1,  size.y * 0.4,  size.z * 0.2)

    loadingEl.classList.add('hidden')
    setTimeout(() => { loadingEl.style.display = 'none' }, 900)
  },

  (xhr) => {
    if (xhr.total) {
      const pct = Math.round(xhr.loaded / xhr.total * 100)
      loadingBar.style.width = pct + '%'
      loadingTxt.textContent = `LOADING SCENE... ${pct}%`
    }
  },

  (err) => {
    console.error('[FBXLoader] 載入失敗:', err)
    loadingTxt.textContent = 'LOAD FAILED — check console'
    loadingTxt.style.color = '#ff4444'
  }
)

// ── 滾輪：調整焦距 ────────────────────────────────────────────────────────────
window.addEventListener('wheel', (e) => {
  e.preventDefault()
  params.focalLength = THREE.MathUtils.clamp(
    params.focalLength + e.deltaY * 0.05,
    14,
    400
  )
  camera.fov = focalLengthToFov(params.focalLength)
  camera.updateProjectionMatrix()
  focalCtrl.updateDisplay()
}, { passive: false })

// ── 滑鼠左鍵：水平旋轉 ───────────────────────────────────────────────────────
let isDragging = false
let prevMouseX = 0
let prevMouseY = 0

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  isDragging = true
  prevMouseX = e.clientX
  prevMouseY = e.clientY
  renderer.domElement.style.cursor = 'grabbing'
})

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const dx = e.clientX - prevMouseX
  prevMouseX = e.clientX
  prevMouseY = e.clientY

  theta -= dx * 0.0005  // 旋轉靈敏度，數值越小越阻尼
  updateCamera()
})

window.addEventListener('mouseup',    () => { isDragging = false; renderer.domElement.style.cursor = 'grab' })
window.addEventListener('mouseleave', () => { isDragging = false; renderer.domElement.style.cursor = 'grab' })
renderer.domElement.style.cursor = 'grab'

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ── Render Loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)
  composer.render()
}
animate()
