// Import modules
import * as THREE from "./mods/three.module.js"
import Stats from "./mods/stats.module.js"
import { OrbitControls } from "./mods/OrbitControls.js"

import { GUI } from "./mods/lil-gui.module.min.js"
import { TWEEN } from "./mods/tween.module.min.js"
import { createMultiMaterialObject } from "./mods/SceneUtils.js"
import { GLTFLoader } from "./mods/GLTFLoader.js"

// Global variables
const mainContainer = document.getElementById("webgl-scene")
let fpsContainer = null
let stats = null
let camera = null
let renderer = null
let scene = null
let camControls = null
let plane = null
let particles = null
let positions = []
let velocities = []

let ctrl = null
let gui = new GUI()

const wolf = new THREE.Group()
const mixers = [] // needed for wolf animations
const clock = new THREE.Clock()

// sound variables
let listener = null
let sound = null
let audioLoader = null
let controlBoxParams = {
  soundon: false,
}

const numSnowFlakes = 15000
const maxRange = 1000
const minRange = maxRange / 2
const minHeight = 150

// needed for raycasting
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let intersects

function init() {
  fpsContainer = document.querySelector("#fps")
  // mainContainer = document.querySelector( '#webgl-scene' );
  let bg = new THREE.CubeTextureLoader().load([
    "img/posx.jpg",
    "img/negx.jpg",
    "img/posy.jpg",
    "img/negy.jpg",
    "img/posz.jpg",
    "img/negz.jpg",
  ])
  scene = new THREE.Scene()
  scene.background = bg

  createStats()
  createCamera()
  createControls()
  createMeshes()
  createSound()
  createLights()
  createRenderer()

  renderer.setAnimationLoop(() => {
    update()
    render()
  })
}

// Animations
function update() {
  const delta = clock.getDelta()
  for (const mixer of mixers) {
    mixer.update(delta)
  }
  TWEEN.update()
  updateParticles()
}

function updateParticles() {
  for (let i = 0; i < numSnowFlakes * 3; i += 3) {
    //ADD VELOCITY TO POSITION OF EACH SNOWFLAKE
    // change x position by x velocity
    particles.geometry.attributes.position.array[i] -=
      particles.geometry.attributes.velocity.array[i]
    // change y position by y velocity
    particles.geometry.attributes.position.array[i + 1] -=
      particles.geometry.attributes.velocity.array[i + 1]
    // change z position by z velocity
    particles.geometry.attributes.position.array[i + 2] -=
      particles.geometry.attributes.velocity.array[i + 2]

    if (particles.geometry.attributes.position.array[i + 1] < 0) {
      particles.geometry.attributes.position.array[i] = Math.floor(
        Math.random() * maxRange - minRange
      )
      particles.geometry.attributes.position.array[i + 1] = Math.floor(
        Math.random() * minRange + minHeight
      )
      particles.geometry.attributes.position.array[i + 2] = Math.floor(
        Math.random() * minRange - minRange
      )
    }
  }

  particles.geometry.attributes.position.needsUpdate = true
}

// Raycasting
function onPointerMove(event) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  intersects = raycaster.intersectObjects(scene.children)
  // for (let i = 0; i < intersects.length; i++) {
  //   intersects[i].object.material.color.set("blue")
  // }
  if (intersects.length > 0) {
    intersects[0].object.material.color.set("yellow")
  }
}

// Statically rendered content
function render() {
  stats.begin()
  renderer.render(scene, camera)

  stats.end()
}

function createSound() {
  listener = new THREE.AudioListener()
  camera.add(listener)

  // create a global audio source
  sound = new THREE.Audio(listener)
  // load a sound and set it as the Audio object's buffer
  audioLoader = new THREE.AudioLoader()
  audioLoader.load("sounds/autumn.mp3", function (buffer) {
    sound.setBuffer(buffer)
    sound.setLoop(true)
    sound.setVolume(0.3)
    //sound.play();
  })

  // sound control
  let sb = gui.add(controlBoxParams, "soundon").name("Sound On/Off")
  sb.listen()
  sb.onChange(function (value) {
    if (value == true) sound.play()
    else sound.stop()
  })
}

// FPS counter
function createStats() {
  stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  fpsContainer.appendChild(stats.dom)
}

// Camera object
function createCamera() {
  const fov = 45
  const aspect = mainContainer.clientWidth / mainContainer.clientHeight
  const near = 0.1
  const far = 500 // meters
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  camera.position.x = 5
  camera.position.y = 5
  camera.position.z = 25
  camera.lookAt(scene.position)
}

// Interactive controls
function createControls() {
  camControls = new OrbitControls(camera, mainContainer)
  camControls.autoRotate = false
}

// Light objects
function createLights() {
  const spotLight = new THREE.SpotLight(0xffffff)
  spotLight.position.set(-20, 25, 10)
  spotLight.shadow.mapSize.width = 2048 // default 512
  spotLight.shadow.mapSize.height = 2048 //default 512
  spotLight.intensity = 1.5
  spotLight.distance = 200
  spotLight.angle = Math.PI / 3
  spotLight.penumbra = 0.4 // 0 - 1
  spotLight.decay = 0.2
  spotLight.castShadow = true
  scene.add(spotLight)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2) // 0x111111 - 0xaaaaaa, 1 ; 0xffffff, 0.1 - 0.3;
  scene.add(ambientLight)
}

function createPlane() {
  const texture = new THREE.TextureLoader().load("img/negy.jpg")
  texture.encoding = THREE.sRGBEncoding
  texture.anisotropy = 16
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  //const planeGeometry = new THREE.PlaneGeometry(50,50);
  let planeGeometry = new THREE.PlaneGeometry(50, 50, 35, 35)
  let pointPos = planeGeometry.getAttribute("position").array
  for (let i = 1, l = pointPos.length / 3; i < l; i++) {
    pointPos[i * 3 - 1] = Math.random()
  }
  pointPos.needsUpdate = true

  const planeMaterial = new THREE.MeshStandardMaterial({ map: texture })
  plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -0.5 * Math.PI
  plane.position.x = 0
  plane.position.y = 0
  plane.position.z = 0
  plane.receiveShadow = true
  scene.add(plane)
}

function createGreenTree(posx, posz, scale) {
  let tree = new THREE.Group()
  const loader = new GLTFLoader()
  const onLoad = (gltf, position, scale) => {
    const model = gltf.scene.children[0]
    //
    model.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
      }
    })
    model.position.copy(position)
    model.scale.set(scale, scale, scale)
    tree.add(model)
  }
  const onProgress = () => {}
  const onError = (errorMessage) => {
    console.log(errorMessage)
  }

  const modelPosition = new THREE.Vector3(posx, 0.1, posz)
  const modelScale = scale
  loader.load(
    "./models/Tree1/uploads_files_3523647_shapespark-low-poly-plants-kit-double-sided-for-baking (1).gltf",
    (gltf) => onLoad(gltf, modelPosition, modelScale),
    onProgress,
    onError
  )
  ctrl.numOfTrees++
  tree.name = "tree-" + ctrl.numOfTrees
  scene.add(tree)
}

class TreeGenerator {
  numOfTrees = 0

  constructor() {}

  showObjectsInfo() {
    // this.numOfTrees = scene.children.length;
    console.log(scene.children)
  }

  addGreenTree() {
    let treePosX = -20 + Math.round(Math.random() * 40)
    let treePosZ = -17.5 + Math.round(Math.random() * 35)
    let treeSize = Math.ceil(Math.random() * 10)
    createGreenTree(treePosX, treePosZ, treeSize)
  }

  removeLastTree() {
    if (this.numOfTrees > 0) {
      let lastTree = scene.getObjectByName("tree-" + this.numOfTrees)
      scene.remove(lastTree)
      this.numOfTrees--
    }
  }
}

function createWolf() {
  const loader = new GLTFLoader()
  const onLoad = (gltf, position, scale) => {
    const model = gltf.scene.children[0]
    model.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
      }
    })
    model.position.copy(position)
    model.scale.set(scale, scale, scale)
    // Model animations
    const animation = gltf.animations[0]
    const mixer = new THREE.AnimationMixer(model)
    mixers.push(mixer)
    const action = mixer.clipAction(animation)
    action.setDuration(10)
    action.play()
    //
    wolf.add(model)
    wolf.name = "Wolf"
  }
  const onProgress = () => {}
  const onError = (errorMessage) => {
    console.log(errorMessage)
  }

  const modelPosition = new THREE.Vector3(-7, 0.1, 4)
  const modelScale = 10
  loader.load(
    "./../models/gltf-wolf/gltf/Wolf-Blender-2.82a.gltf",
    (gltf) => onLoad(gltf, modelPosition, modelScale),
    onProgress,
    onError
  )
  scene.add(wolf)
}

function addSnowFlakes() {
  //1 CREATE SNOWFLAKE GEOMETRY
  const geometry = new THREE.BufferGeometry()

  for (let i = 0; i < numSnowFlakes; i++) {
    positions.push(
      Math.floor(Math.random() * maxRange - minRange),
      Math.floor(Math.random() * minRange + minHeight),
      Math.floor(Math.random() * minRange - minRange)
    )
    velocities.push(
      Math.floor(Math.random() * 6 - 3) * 0.1,
      Math.floor(Math.random() * 5 + 0.12) * 0.18,
      Math.floor(Math.random() * 6 - 3) * 0.1
    )
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute(
    "velocity",
    new THREE.Float32BufferAttribute(velocities, 3)
  )

  const textureLoader = new THREE.TextureLoader()
  //2 CREATE SNOWFLAKE MATERIAL
  const flakeMaterial = new THREE.PointsMaterial({
    size: 4,
    map: textureLoader.load("img/snowflake.png"),
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    opacity: 0.7,
  })

  particles = new THREE.Points(geometry, flakeMaterial)
  scene.add(particles)
}

function createBucket(form) {
  let points = []
  for (let i = 0; i < 10; i++) {
    points.push(new THREE.Vector2(Math.sin(i * form) + 2, i))
  }
  // Rotate according y axis
  const latheGeom = new THREE.LatheGeometry(points)

  // Notice DoubleSide
  const materials = [
    new THREE.MeshLambertMaterial({
      opacity: 0.6,
      color: 0xffcc00,
      transparent: true,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }),
  ]

  const mesh = createMultiMaterialObject(latheGeom, materials)
  mesh.children.forEach(function (e) {
    e.castShadow = true
    // e.geometry.computeFaceNormals();
  })

  return mesh
}

function createVase(rotatePrec, heightPrec) {
  const spline = new THREE.SplineCurve([
    new THREE.Vector2(2, 0),
    new THREE.Vector2(3, 1),
    new THREE.Vector2(4, 2),
    new THREE.Vector2(3, 3),
    new THREE.Vector2(2, 4),
    new THREE.Vector2(1.5, 5),
    new THREE.Vector2(2, 6),
  ])
  const vertices = spline.getPoints(heightPrec)

  const latheGeom = new THREE.LatheGeometry(vertices, rotatePrec)
  //const latheGeom = new THREE.LatheGeometry(splineGeometry.vertices, rotatePrec, 0, Math.PI);

  const materials = [
    new THREE.MeshLambertMaterial({
      opacity: 0.6,
      color: 0xffcc00,
      transparent: true,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }),
  ]

  let mesh = createMultiMaterialObject(latheGeom, materials)
  mesh.children.forEach(function (e) {
    e.castShadow = true
    // e.geometry.computeFaceNormals();
  })

  return mesh
}

function createMeshes() {
  createPlane(plane)

  ctrl = new TreeGenerator()
  createGreenTree(0, 0, 2)

  gui.add(ctrl, "numOfTrees").name("Number of trees").listen()
  gui.add(ctrl, "addGreenTree").name("Add Green tree")
  gui.add(ctrl, "removeLastTree").name("Remove Green tree")
  gui.add(ctrl, "showObjectsInfo").name("Show info")

  createWolf()

  let bucket = createBucket(0.1)
  bucket.position.set(-4, 0.1, 8.0)
  bucket.scale.set(0.2, 0.2, 0.2)
  bucket.name = "bucket"
  scene.add(bucket)

  let vase = createVase(24, 50)
  vase.position.set(3, 0.1, 8.0)
  vase.scale.set(0.3, 0.3, 0.3)
  vase.name = "vase"
  scene.add(vase)
  let rot = { y: 0 }
  let tween = new TWEEN.Tween(rot).to({ y: 3.14 }, 20000)
  tween.easing(TWEEN.Easing.Linear.None)
  tween.onUpdate(() => {
    vase.rotation.y = rot.y
  })
  tween.repeat(Infinity)
  tween.start()
  addSnowFlakes()
}

// Renderer object and features
function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setSize(mainContainer.clientWidth, mainContainer.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap //THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap
  mainContainer.appendChild(renderer.domElement)
  // Raycastin calling
  // window.addEventListener("pointermove", onPointerMove)
}

window.addEventListener("resize", (e) => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

init()
