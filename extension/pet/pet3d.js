// The user's own 3D pet (a .glb file kept in the plugin's storage), drawn in
// a small transparent frame on the page. The pet on the page tells it the mood
// ("idle", "happy", ...). Animations with a matching name are played; a
// model without them is moved gently instead (bob, hop, tilt, shake).
import * as THREE from "./three/build/three.module.js"
import { GLTFLoader } from "./three/examples/jsm/loaders/GLTFLoader.js"

const CLIP = { idle: /idle|breath|stand/i, happy: /happy|jump|yes|dance|wave|cheer/i, think: /think|look|idle/i, talk: /talk|speak|yes|idle/i, sleep: /sleep|lay|lie|rest|idle/i, alert: /alert|surprise|jump|attack|shake/i, sad: /sad|no|hit|death|idle/i }
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.append(renderer.domElement)
const scene = new THREE.Scene()
scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.1))
const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(2, 4, 3); scene.add(sun)
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000)
const holder = new THREE.Group(); scene.add(holder)
let modelH = 1, model = null, mixer = null, clips = [], action = null, mood = "idle"
const clock = new THREE.Clock()

const size = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
addEventListener("resize", size); size()

function load() {
  const r = indexedDB.open("vidi-pet", 1)
  r.onupgradeneeded = () => r.result.createObjectStore("files")
  r.onsuccess = () => {
    const get = r.result.transaction("files").objectStore("files").get("pet.glb")
    get.onsuccess = () => get.result && new GLTFLoader().parse(get.result, "", (g) => {
      model = g.scene; holder.add(model)
      // fit the whole model in view, standing on the bottom
      const box = new THREE.Box3().setFromObject(model), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
      model.position.sub(c)
      const d = Math.max(s.x, s.y, s.z); modelH = s.y
      camera.position.set(0, s.y * 0.1, d * 2.1); camera.lookAt(0, 0, 0)
      clips = g.animations || []
      mixer = new THREE.AnimationMixer(model)
      play(mood)
    }, () => parent.postMessage({ vidi3d: "error" }, "*"))
  }
}
function play(m) {
  mood = m
  if (!mixer) return
  const clip = clips.find((c) => CLIP[m]?.test(c.name)) || clips.find((c) => CLIP.idle.test(c.name)) || clips[0]
  if (!clip) return
  const next = mixer.clipAction(clip)
  if (next === action) return
  next.reset().fadeIn(0.3).play(); action?.fadeOut(0.3); action = next
}
addEventListener("message", (e) => { if (typeof e.data?.mood === "string") play(e.data.mood) })

function loop() {
  requestAnimationFrame(loop)
  const dt = clock.getDelta(), t = clock.elapsedTime
  mixer?.update(dt)
  if (model && !action) {
    // no animations in the file: gentle moves by mood
    const h = modelH
    holder.rotation.set(mood === "sad" ? 0.2 : 0, mood === "sleep" ? 0 : Math.sin(t * 0.6) * 0.25, mood === "think" ? 0.15 : mood === "alert" ? Math.sin(t * 25) * 0.12 : 0)
    holder.position.y = h * (mood === "happy" ? Math.abs(Math.sin(t * 7)) * 0.12 : Math.sin(t * 2) * 0.015)
  }
  renderer.render(scene, camera)
}
load(); loop()
