import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DIR_DELTA, posKey } from './engine';
import { ChapterTheme, Dir, LevelData, TraceStep } from './types';

// Zero-GC reusable math helpers
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

const TILE_SIZE = 1.2;

export const DIR_TO_YAW: Record<Dir, number> = {
  N: Math.PI, // facing -Z
  E: Math.PI / 2, // facing +X
  S: 0, // facing +Z
  W: -Math.PI / 2, // facing -X
};

interface ThemePalette {
  bg: number;
  fogDensity: number;
  tileA: string;
  tileB: string;
  tileBorder: string;
  islandSide: number;
  surroundColor: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  accent: number;
}

const THEME_PALETTES: Record<ChapterTheme, ThemePalette> = {
  forest: {
    bg: 0x0f2b38,
    fogDensity: 0.019,
    tileA: '#54b96e',
    tileB: '#44a35e',
    tileBorder: '#2f7a44',
    islandSide: 0x6b4c35,
    surroundColor: 0x265e46,
    sunColor: 0xfff3d1,
    sunIntensity: 1.9,
    hemiSky: 0xa7f3d0,
    hemiGround: 0x2e4a35,
    hemiIntensity: 0.85,
    accent: 0x34d399,
  },
  desert: {
    bg: 0x382012,
    fogDensity: 0.018,
    tileA: '#e8c07d',
    tileB: '#d9ae67',
    tileBorder: '#b08342',
    islandSide: 0x9c6638,
    surroundColor: 0x87542b,
    sunColor: 0xffe4a8,
    sunIntensity: 2.1,
    hemiSky: 0xfde68a,
    hemiGround: 0x6b3f1d,
    hemiIntensity: 0.85,
    accent: 0xf59e0b,
  },
  ruins: {
    bg: 0x1d1b31,
    fogDensity: 0.02,
    tileA: '#8b87a8',
    tileB: '#767294',
    tileBorder: '#524e6e',
    islandSide: 0x45415e,
    surroundColor: 0x322f47,
    sunColor: 0xf3e8ff,
    sunIntensity: 1.8,
    hemiSky: 0xc4b5fd,
    hemiGround: 0x2b2740,
    hemiIntensity: 0.85,
    accent: 0xa78bfa,
  },
  ice: {
    bg: 0x0d2742,
    fogDensity: 0.018,
    tileA: '#bae6fd',
    tileB: '#93c5fd',
    tileBorder: '#60a5fa',
    islandSide: 0x3b82f6,
    surroundColor: 0x1e4068,
    sunColor: 0xe0f2fe,
    sunIntensity: 2.0,
    hemiSky: 0xbae6fd,
    hemiGround: 0x1d3b5c,
    hemiIntensity: 0.9,
    accent: 0x38bdf8,
  },
  volcano: {
    bg: 0x261210,
    fogDensity: 0.021,
    tileA: '#645c63',
    tileB: '#524a52',
    tileBorder: '#ea580c',
    islandSide: 0x3a2626,
    surroundColor: 0x401c15,
    sunColor: 0xffd7b5,
    sunIntensity: 1.9,
    hemiSky: 0xfdba74,
    hemiGround: 0x451a14,
    hemiIntensity: 0.8,
    accent: 0xf97316,
  },
  sky: {
    bg: 0x17325c,
    fogDensity: 0.016,
    tileA: '#e0e7ff',
    tileB: '#c7d2fe',
    tileBorder: '#818cf8',
    islandSide: 0x6366f1,
    surroundColor: 0x3b5998,
    sunColor: 0xfff8e7,
    sunIntensity: 2.0,
    hemiSky: 0xe0e7ff,
    hemiGround: 0x4338ca,
    hemiIntensity: 0.9,
    accent: 0xc084fc,
  },
  crystal: {
    bg: 0x1e1033,
    fogDensity: 0.02,
    tileA: '#9d74b8',
    tileB: '#825ba0',
    tileBorder: '#d946ef',
    islandSide: 0x4c1d6e,
    surroundColor: 0x30144a,
    sunColor: 0xfce7f3,
    sunIntensity: 1.85,
    hemiSky: 0xf5d0fe,
    hemiGround: 0x3b1254,
    hemiIntensity: 0.85,
    accent: 0xf472b6,
  },
  space: {
    bg: 0x070d1f,
    fogDensity: 0.014,
    tileA: '#334155',
    tileB: '#253144',
    tileBorder: '#38bdf8',
    islandSide: 0x1e293b,
    surroundColor: 0x0f172a,
    sunColor: 0xe0f2fe,
    sunIntensity: 2.0,
    hemiSky: 0x7dd3fc,
    hemiGround: 0x0f172a,
    hemiIntensity: 0.85,
    accent: 0x38bdf8,
  },
};

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function makeTileTexture(
  fill: string,
  border: string,
  maxAnisotropy: number,
  label?: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle surface grain / diagonal bevel feel
  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(14, 14, 228, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(14, 224, 228, 18);

  // Subtle center diamond accent
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.beginPath();
  ctx.moveTo(128, 86);
  ctx.lineTo(170, 128);
  ctx.lineTo(128, 170);
  ctx.lineTo(86, 128);
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.beginPath();
    ctx.arc(128, 128, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 74px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 132);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeDoorSignTexture(text: string, bg: string, maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 62px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface DoorVisual {
  group: THREE.Group;
  bars: THREE.Group;
  signMat: THREE.MeshStandardMaterial;
  opened: boolean;
  openProgress: number;
}

interface RobotRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  antennaTip: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  eyeMat: THREE.MeshStandardMaterial;
  dirArrow: THREE.Mesh;
}

interface ActiveAnim {
  kind: 'move' | 'turn' | 'collect' | 'bump' | 'win' | 'unlock';
  elapsed: number;
  duration: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  fromYaw: number;
  toYaw: number;
}

export class CodingWorld3D {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Lights
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  // Scene groups
  private worldGroup = new THREE.Group();
  private robot!: RobotRig;
  private gemMeshes = new Map<string, THREE.Group>();
  private bonusMeshes = new Map<string, THREE.Group>();
  private doorVisuals = new Map<string, DoorVisual>();
  private flagPennant: THREE.Mesh | null = null;
  private goalHalo: THREE.Mesh | null = null;
  private starfield: THREE.Points | null = null;

  // Pooled particles
  private particles: Particle[] = [];
  private particleGroup = new THREE.Group();

  // State
  private currentLevel: LevelData | null = null;
  private currentTheme: ChapterTheme = 'forest';
  private centerOffsetX = 0;
  private centerOffsetZ = 0;
  private activeAnim: ActiveAnim | null = null;
  private cameraTransitioning = false;
  private idleDemoMode = false;
  private contactShadowTex: THREE.CanvasTexture;
  private maxAnisotropy: number;
  private disposableTextures: THREE.Texture[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.maxAnisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    this.contactShadowTex = makeContactShadowTexture();

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Scene & Studio Environment Reflection (mandatory on all devices)
    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera (Isometric-feel low FOV Perspective for depth + clarity)
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.2, 160);
    this.camera.position.set(7.5, 9.2, 8.8);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2.25;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 24;
    this.controls.enablePan = false;
    this.controls.addEventListener('start', () => {
      this.cameraTransitioning = false;
    });

    // Warm/Cool 3-Point Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x2e4a35, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d1, 1.9);
    this.sunLight.position.set(8, 14, 7);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 36;
    const d = 9.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    this.rimLight.position.set(-7, 6, -8);
    this.scene.add(this.rimLight);

    this.scene.add(this.worldGroup);
    this.scene.add(this.particleGroup);

    // Build reusable pooled particles
    const pGeo = new THREE.OctahedronGeometry(0.11, 0);
    for (let i = 0; i < 36; i++) {
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.particleGroup.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1 });
    }

    // Build Composite 12-Part Cute Robot
    this.robot = this.buildRobot();
    this.scene.add(this.robot.root);

    // Handle WebGL context loss safely
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    this.resize();
    this.startLoop();
  }

  private gridToWorldX(gx: number): number {
    return (gx - this.centerOffsetX) * TILE_SIZE;
  }

  private gridToWorldZ(gy: number): number {
    return (gy - this.centerOffsetZ) * TILE_SIZE;
  }

  private buildRobot(): RobotRig {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Contact shadow grounded directly on tile surface
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    root.add(shadowPlane);

    // Glowing floor direction chevron right in front (+Z in local space)
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.24);
    arrowShape.lineTo(0.22, -0.06);
    arrowShape.lineTo(0.08, -0.02);
    arrowShape.lineTo(0.08, -0.18);
    arrowShape.lineTo(-0.08, -0.18);
    arrowShape.lineTo(-0.08, -0.02);
    arrowShape.lineTo(-0.22, -0.06);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const dirArrow = new THREE.Mesh(arrowGeo, arrowMat);
    dirArrow.rotation.x = Math.PI / 2;
    dirArrow.position.set(0, 0.03, 0.52);
    root.add(dirArrow);

    // Materials with varied roughness & metalness (>= 0.25 contrast)
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.15,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.22,
      metalness: 0.45,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.72,
      metalness: 0.35,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.18,
      metalness: 0.85,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.4,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    // 1-2. Left & Right Treads/Boots
    const treadGeo = new THREE.BoxGeometry(0.18, 0.16, 0.36);
    const leftTread = new THREE.Mesh(treadGeo, darkMetalMat);
    leftTread.position.set(-0.2, 0.08, 0);
    leftTread.castShadow = true;
    bodyGroup.add(leftTread);

    const rightTread = new THREE.Mesh(treadGeo, darkMetalMat);
    rightTread.position.set(0.2, 0.08, 0);
    rightTread.castShadow = true;
    bodyGroup.add(rightTread);

    // 3. Waist Axle & Power Ring
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.1, 14), chromeMat);
    waist.position.y = 0.2;
    bodyGroup.add(waist);

    // 4. Primary Torso Hull
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.4), hullMat);
    torso.position.y = 0.44;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 5. Chest Core Accent Plate
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.05), accentMat);
    chestPlate.position.set(0, 0.46, 0.2);
    bodyGroup.add(chestPlate);

    const chestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), eyeMat);
    chestCore.rotation.x = Math.PI / 2;
    chestCore.position.set(0, 0.46, 0.22);
    bodyGroup.add(chestCore);

    // 6. Mini Jetpack on Back (-Z)
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.14), accentMat);
    pack.position.set(0, 0.45, -0.24);
    pack.castShadow = true;
    bodyGroup.add(pack);

    const thrusterGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.14, 10);
    const leftThruster = new THREE.Mesh(thrusterGeo, chromeMat);
    leftThruster.position.set(-0.09, 0.3, -0.25);
    bodyGroup.add(leftThruster);
    const rightThruster = new THREE.Mesh(thrusterGeo, chromeMat);
    rightThruster.position.set(0.09, 0.3, -0.25);
    bodyGroup.add(rightThruster);

    // 7-8. Articulated Arms
    const buildArm = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.31, 0.54, 0);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), accentMat);
      pivot.add(shoulder);
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 6, 10), hullMat);
      forearm.position.set(side * 0.03, -0.14, 0.02);
      forearm.castShadow = true;
      pivot.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), darkMetalMat);
      hand.position.set(side * 0.03, -0.26, 0.04);
      pivot.add(hand);
      return pivot;
    };
    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);
    bodyGroup.add(leftArm, rightArm);

    // 9. Head Casing + Ear Caps
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.36, 0.44), hullMat);
    head.position.y = 0.84;
    head.castShadow = true;
    bodyGroup.add(head);

    const earGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12);
    const leftEar = new THREE.Mesh(earGeo, accentMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.29, 0.84, 0);
    bodyGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, accentMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(0.29, 0.84, 0);
    bodyGroup.add(rightEar);

    // 10. Glossy Visor & Glowing Eyes
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.05), visorMat);
    visor.position.set(0, 0.84, 0.21);
    bodyGroup.add(visor);

    const eyeGeo = new THREE.SphereGeometry(0.052, 10, 10);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.11, 0.85, 0.235);
    leftEye.scale.set(1, 1.15, 0.4);
    bodyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.11, 0.85, 0.235);
    rightEye.scale.set(1, 1.15, 0.4);
    bodyGroup.add(rightEye);

    // 11-12. Antenna Stem + Glowing Orb
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.2, 8), chromeMat);
    stem.position.set(0, 1.11, 0);
    bodyGroup.add(stem);

    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      })
    );
    antennaTip.position.set(0, 1.24, 0);
    bodyGroup.add(antennaTip);

    return {
      root,
      bodyGroup,
      leftArm,
      rightArm,
      antennaTip,
      leftEye,
      rightEye,
      eyeMat,
      dirArrow,
    };
  }

  private buildObstacle(theme: ChapterTheme, seed: number): THREE.Group {
    const g = new THREE.Group();
    const s = 0.92 + ((seed * 37) % 16) * 0.01;

    switch (theme) {
      case 'forest': {
        // Composite Pine Tree + mossy rock base
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.16, 0.45, 8),
          new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.88 })
        );
        trunk.position.y = 0.22;
        trunk.castShadow = true;
        g.add(trunk);

        const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
        const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
        const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.55, 7), foliageMat1);
        cone1.position.y = 0.62;
        cone1.castShadow = true;
        const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.48, 7), foliageMat2);
        cone2.position.y = 0.96;
        cone2.castShadow = true;
        const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, 7), foliageMat1);
        cone3.position.y = 1.26;
        cone3.castShadow = true;
        g.add(cone1, cone2, cone3);
        break;
      }
      case 'desert': {
        // Sandstone rock + saguaro cactus
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.38, 0),
          new THREE.MeshStandardMaterial({ color: 0xc27849, roughness: 0.88 })
        );
        rock.scale.set(1.1, 0.75, 1.0);
        rock.position.set(-0.08, 0.24, 0.05);
        rock.castShadow = true;
        g.add(rock);

        const cactusMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
        const mainCactus = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 6, 8), cactusMat);
        mainCactus.position.set(0.14, 0.42, -0.05);
        mainCactus.castShadow = true;
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 4, 8), cactusMat);
        armL.position.set(0.0, 0.52, -0.05);
        armL.rotation.z = 0.55;
        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.18, 4, 8), cactusMat);
        armR.position.set(0.28, 0.58, -0.05);
        armR.rotation.z = -0.5;
        g.add(mainCactus, armL, armR);
        break;
      }
      case 'ruins': {
        // Ancient stone pillar + bronze gear accent
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.84), stoneMat);
        base.position.y = 0.11;
        base.castShadow = true;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.75, 8), stoneMat);
        col.position.y = 0.58;
        col.castShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.15, 0.76), stoneMat);
        cap.position.y = 1.0;
        const gear = new THREE.Mesh(
          new THREE.TorusGeometry(0.22, 0.06, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.28 })
        );
        gear.position.set(0, 0.6, 0.3);
        g.add(base, col, cap, gear);
        break;
      }
      case 'ice': {
        // Faceted glacier crystal cluster
        const iceMat = new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x0369a1,
          emissiveIntensity: 0.25,
          roughness: 0.14,
          metalness: 0.25,
        });
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.85 });
        const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.2, 8), snowMat);
        mound.position.y = 0.1;
        const spire1 = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.05, 6), iceMat);
        spire1.position.set(0, 0.62, 0);
        spire1.castShadow = true;
        const spire2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 5), iceMat);
        spire2.position.set(0.22, 0.42, 0.12);
        spire2.rotation.z = -0.25;
        const spire3 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 5), iceMat);
        spire3.position.set(-0.22, 0.38, -0.1);
        spire3.rotation.z = 0.28;
        g.add(mound, spire1, spire2, spire3);
        break;
      }
      case 'volcano': {
        // Obsidian basalt spire + glowing lava core
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
        const lavaMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 1.2,
          roughness: 0.35,
        });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.72, 6), rockMat);
        base.position.y = 0.36;
        base.castShadow = true;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 6, 10), lavaMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.7;
        const tip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), rockMat);
        tip.position.set(0.14, 0.85, -0.05);
        g.add(base, ring, tip);
        break;
      }
      case 'sky': {
        // Marble temple column + fluffy cloud puff
        const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
        const goldMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.8,
          roughness: 0.22,
        });
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.76), marbleMat);
        plinth.position.y = 0.09;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.78, 12), marbleMat);
        shaft.position.y = 0.56;
        shaft.castShadow = true;
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), goldMat);
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.92;
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), goldMat);
        orb.position.y = 1.1;
        g.add(plinth, shaft, band, orb);
        break;
      }
      case 'crystal': {
        // Amethyst quartz cluster
        const base = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.4, 0),
          new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.85 })
        );
        base.scale.set(1.1, 0.55, 1.1);
        base.position.y = 0.18;
        const qMat = new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xa21caf,
          emissiveIntensity: 0.55,
          roughness: 0.15,
          metalness: 0.35,
        });
        const q1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), qMat);
        q1.scale.set(0.7, 1.9, 0.7);
        q1.position.y = 0.65;
        q1.castShadow = true;
        const q2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), qMat);
        q2.scale.set(0.7, 1.6, 0.7);
        q2.position.set(0.22, 0.48, 0.12);
        q2.rotation.z = -0.35;
        g.add(base, q1, q2);
        break;
      }
      case 'space': {
        // Sci-fi energy barrier pylon
        const darkMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.35,
        });
        const glowMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.3,
          roughness: 0.2,
        });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.22, 8), darkMat);
        base.position.y = 0.11;
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.74, 8), darkMat);
        core.position.y = 0.56;
        core.castShadow = true;
        const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 14), glowMat);
        r1.rotation.x = Math.PI / 2;
        r1.position.y = 0.45;
        const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 14), glowMat);
        r2.rotation.x = Math.PI / 2;
        r2.position.y = 0.75;
        const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowMat);
        cap.position.y = 1.05;
        g.add(base, core, r1, r2, cap);
        break;
      }
    }

    g.scale.setScalar(s);
    return g;
  }

  private buildGem(isBonus: boolean): THREE.Group {
    const g = new THREE.Group();

    const baseGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.32, 20),
      new THREE.MeshBasicMaterial({
        color: isBonus ? 0xfde047 : 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })
    );
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.y = 0.025;
    g.add(baseGlow);

    const floatPart = new THREE.Group();
    floatPart.name = 'floatPart';
    floatPart.position.y = isBonus ? 0.58 : 0.46;

    if (isBonus) {
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
        roughness: 0.16,
        metalness: 0.85,
      });
      const starA = new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 0), goldMat);
      const starB = new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 0), goldMat);
      starB.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 20), goldMat);
      halo.rotation.x = Math.PI / 2.4;
      floatPart.add(starA, starB, halo);
    } else {
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.12,
        metalness: 0.35,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), gemMat);
      crystal.scale.set(0.88, 1.28, 0.88);
      crystal.castShadow = true;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.025, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.85, roughness: 0.2 })
      );
      band.rotation.x = Math.PI / 2;
      floatPart.add(crystal, band);
    }

    g.add(floatPart);
    return g;
  }

  private buildGoalFlag(): THREE.Group {
    const g = new THREE.Group();

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.5, 0.06, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.5,
      })
    );
    pad.position.y = 0.03;
    g.add(pad);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.52, 24),
      new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.07;
    this.goalHalo = halo;
    g.add(halo);

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.45, 10), poleMat);
    pole.position.set(0.28, 0.75, -0.26);
    pole.castShadow = true;
    g.add(pole);

    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 })
    );
    finial.position.set(0.28, 1.5, -0.26);
    g.add(finial);

    // Triangular waving flag
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0.62, -0.18);
    flagShape.lineTo(0, -0.38);
    flagShape.closePath();
    const flagGeo = new THREE.ExtrudeGeometry(flagShape, { depth: 0.03, bevelEnabled: false });
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.28,
      roughness: 0.45,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.28, 1.42, -0.27);
    flag.castShadow = true;
    this.flagPennant = flag;
    g.add(flag);

    return g;
  }

  private buildDoor(requiredKey?: number, requiredGems?: number): DoorVisual {
    const group = new THREE.Group();

    const archMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.6,
      roughness: 0.35,
    });
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.22), archMat);
    pillarL.position.set(-0.46, 0.625, 0);
    pillarL.castShadow = true;
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.22), archMat);
    pillarR.position.set(0.46, 0.625, 0);
    pillarR.castShadow = true;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.2, 0.26), archMat);
    lintel.position.set(0, 1.25, 0);
    group.add(pillarL, pillarR, lintel);

    const bars = new THREE.Group();
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.4,
    });
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), barMat);
      bar.position.set(i * 0.22, 0.56, 0);
      bars.add(bar);
    }
    group.add(bars);

    const label =
      requiredKey !== undefined ? `🔑 ${requiredKey}` : `💎 ${requiredGems ?? 1}`;
    const signTex = makeDoorSignTexture(label, '#881337', this.maxAnisotropy);
    this.disposableTextures.push(signTex);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.35,
      metalness: 0.1,
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 0.08), signMat);
    signBoard.position.set(0, 1.56, 0);
    // Slight tilt toward isometric viewer
    signBoard.rotation.y = Math.PI / 4;
    group.add(signBoard);

    return { group, bars, signMat, opened: false, openProgress: 0 };
  }

  private clearWorld() {
    this.gemMeshes.clear();
    this.bonusMeshes.clear();
    this.doorVisuals.clear();
    this.flagPennant = null;
    this.goalHalo = null;
    this.starfield = null;

    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }

    this.disposableTextures.forEach((t) => t.dispose());
    this.disposableTextures = [];
  }

  public loadLevel(level: LevelData, theme: ChapterTheme, idleDemo = false) {
    this.clearWorld();
    this.currentLevel = level;
    this.currentTheme = theme;
    this.idleDemoMode = idleDemo;
    this.activeAnim = null;

    const pal = THEME_PALETTES[theme];
    this.scene.background = new THREE.Color(pal.bg);
    this.scene.fog = new THREE.FogExp2(pal.bg, pal.fogDensity);

    this.sunLight.color.setHex(pal.sunColor);
    this.sunLight.intensity = pal.sunIntensity;
    this.hemiLight.color.setHex(pal.hemiSky);
    this.hemiLight.groundColor.setHex(pal.hemiGround);
    this.hemiLight.intensity = pal.hemiIntensity;

    this.centerOffsetX = (level.width - 1) / 2;
    this.centerOffsetZ = (level.height - 1) / 2;

    const texA = makeTileTexture(pal.tileA, pal.tileBorder, this.maxAnisotropy);
    const texB = makeTileTexture(pal.tileB, pal.tileBorder, this.maxAnisotropy);
    this.disposableTextures.push(texA, texB);

    const padMap = new Map<string, string>();
    for (const p of level.numberPads ?? []) {
      padMap.set(posKey(p.x, p.y), p.label);
    }

    const tileGeo = new THREE.BoxGeometry(TILE_SIZE - 0.04, 0.34, TILE_SIZE - 0.04);
    const sideMat = new THREE.MeshStandardMaterial({ color: pal.islandSide, roughness: 0.85 });
    const topMatA = new THREE.MeshStandardMaterial({ map: texA, roughness: 0.65, metalness: 0.06 });
    const topMatB = new THREE.MeshStandardMaterial({ map: texB, roughness: 0.65, metalness: 0.06 });

    for (let gy = 0; gy < level.height; gy++) {
      for (let gx = 0; gx < level.width; gx++) {
        const key = posKey(gx, gy);
        const padLabel = padMap.get(key);
        let topMat = (gx + gy) % 2 === 0 ? topMatA : topMatB;
        if (padLabel) {
          const padTex = makeTileTexture(pal.tileA, '#fbbf24', this.maxAnisotropy, padLabel);
          this.disposableTextures.push(padTex);
          topMat = new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.5 });
        }

        const tile = new THREE.Mesh(tileGeo, [
          sideMat,
          sideMat,
          topMat,
          sideMat,
          sideMat,
          sideMat,
        ]);
        tile.position.set(this.gridToWorldX(gx), -0.17, this.gridToWorldZ(gy));
        tile.receiveShadow = true;
        this.worldGroup.add(tile);
      }
    }

    // Extended Grounded Surround Diorama Base (never floating naked grid in a void)
    const boardW = level.width * TILE_SIZE;
    const boardD = level.height * TILE_SIZE;

    const rimPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(boardW + 1.4, 0.55, boardD + 1.4),
      new THREE.MeshStandardMaterial({ color: pal.islandSide, roughness: 0.88 })
    );
    rimPlatform.position.set(0, -0.58, 0);
    rimPlatform.receiveShadow = true;
    this.worldGroup.add(rimPlatform);

    // Wide scenic outer terrain / water / space horizon plane
    const outerGround = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 32, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: pal.surroundColor,
        roughness: theme === 'ice' ? 0.25 : 0.9,
        metalness: theme === 'space' ? 0.35 : 0.05,
      })
    );
    outerGround.position.y = -1.28;
    outerGround.receiveShadow = true;
    this.worldGroup.add(outerGround);

    // Decorative natural perimeter props outside the playable board
    const perimeterCount = 14;
    const radX = boardW * 0.5 + 2.3;
    const radZ = boardD * 0.5 + 2.3;
    for (let i = 0; i < perimeterCount; i++) {
      const ang = (i / perimeterCount) * Math.PI * 2 + 0.22;
      const px = Math.cos(ang) * (radX + (i % 3) * 1.15);
      const pz = Math.sin(ang) * (radZ + ((i + 1) % 3) * 1.15);
      const decor = this.buildObstacle(theme, i + 11);
      decor.position.set(px, -0.88, pz);
      decor.rotation.y = ang * 1.7;
      decor.scale.multiplyScalar(1.15 + (i % 3) * 0.22);
      this.worldGroup.add(decor);
    }

    // Starfield for Space / Crystal / Sky magic atmosphere
    if (theme === 'space' || theme === 'crystal' || theme === 'ruins') {
      const starCount = 180;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 26;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = 2 + Math.random() * 14;
        positions[i * 3 + 2] = Math.sin(theta) * r;
      }
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const sMat = new THREE.PointsMaterial({
        color: theme === 'crystal' ? 0xf5d0fe : 0xe0f2fe,
        size: 0.16,
        transparent: true,
        opacity: 0.85,
      });
      this.starfield = new THREE.Points(sGeo, sMat);
      this.worldGroup.add(this.starfield);
    }

    // Walls / Obstacles on playable tiles
    level.walls.forEach((w, idx) => {
      const obs = this.buildObstacle(theme, idx + 1);
      obs.position.set(this.gridToWorldX(w.x), 0, this.gridToWorldZ(w.y));
      this.worldGroup.add(obs);
    });

    // Regular Gems
    level.gems.forEach((g) => {
      const k = posKey(g.x, g.y);
      const mesh = this.buildGem(false);
      mesh.position.set(this.gridToWorldX(g.x), 0, this.gridToWorldZ(g.y));
      this.worldGroup.add(mesh);
      this.gemMeshes.set(k, mesh);
    });

    // Bonus Golden Gems
    level.bonusGems.forEach((g) => {
      const k = posKey(g.x, g.y);
      const mesh = this.buildGem(true);
      mesh.position.set(this.gridToWorldX(g.x), 0, this.gridToWorldZ(g.y));
      this.worldGroup.add(mesh);
      this.bonusMeshes.set(k, mesh);
    });

    // Locked Doors (Ch. 7)
    (level.doors ?? []).forEach((d) => {
      const k = posKey(d.x, d.y);
      const door = this.buildDoor(d.requiredKey, d.requiredGems);
      door.group.position.set(this.gridToWorldX(d.x), 0, this.gridToWorldZ(d.y));
      this.worldGroup.add(door.group);
      this.doorVisuals.set(k, door);
    });

    // Goal Flag
    const flag = this.buildGoalFlag();
    flag.position.set(this.gridToWorldX(level.goal.x), 0, this.gridToWorldZ(level.goal.y));
    this.worldGroup.add(flag);

    // Place Robot at start
    this.resetRobotToStart();

    // Smoothly frame the board in isometric view
    this.resetCamera(true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public resetRobotToStart() {
    if (!this.currentLevel) return;
    this.activeAnim = null;
    const { x, y, dir } = this.currentLevel.start;
    this.robot.root.position.set(this.gridToWorldX(x), 0, this.gridToWorldZ(y));
    this.robot.root.rotation.set(0, DIR_TO_YAW[dir], 0);
    this.robot.bodyGroup.position.set(0, 0, 0);
    this.robot.bodyGroup.rotation.set(0, 0, 0);
    this.robot.bodyGroup.scale.set(1, 1, 1);
    this.setRobotMood('normal');

    this.gemMeshes.forEach((m) => {
      m.visible = true;
      m.scale.setScalar(1);
    });
    this.bonusMeshes.forEach((m) => {
      m.visible = true;
      m.scale.setScalar(1);
    });
    this.doorVisuals.forEach((d) => {
      d.opened = false;
      d.openProgress = 0;
      d.bars.position.y = 0;
      d.bars.visible = true;
    });
  }

  public resetCamera(immediate = false) {
    if (!this.currentLevel) return;
    const span = Math.max(this.currentLevel.width, this.currentLevel.height);
    const dist = Math.max(8.2, span * 1.95 + 2.2);
    _targetLookAt.set(0, 0.2, 0.15);
    _targetCamPos.set(dist * 0.62, dist * 0.88, dist * 0.78);

    if (immediate) {
      this.camera.position.copy(_targetCamPos);
      this.controls.target.copy(_targetLookAt);
      this.controls.update();
      this.cameraTransitioning = false;
    } else {
      this.cameraTransitioning = true;
    }
  }

  private setRobotMood(mood: 'normal' | 'happy' | 'oops') {
    if (mood === 'happy') {
      this.robot.eyeMat.color.setHex(0x4ade80);
      this.robot.eyeMat.emissive.setHex(0x22c55e);
    } else if (mood === 'oops') {
      this.robot.eyeMat.color.setHex(0xf87171);
      this.robot.eyeMat.emissive.setHex(0xef4444);
    } else {
      this.robot.eyeMat.color.setHex(0x38bdf8);
      this.robot.eyeMat.emissive.setHex(0x38bdf8);
    }
  }

  private spawnParticles(wx: number, wy: number, wz: number, colorHex: number, count = 14) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.life <= 0 && spawned < count) {
        p.life = 0.65 + Math.random() * 0.35;
        p.maxLife = p.life;
        p.mesh.position.set(wx, wy, wz);
        p.mesh.visible = true;
        p.mesh.scale.setScalar(1);
        const mat = p.mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(colorHex);
        mat.emissive.setHex(colorHex);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.2;
        p.vel.set(Math.cos(angle) * speed, 2.4 + Math.random() * 2.2, Math.sin(angle) * speed);
        spawned++;
      }
    }
  }

  public playStep(step: TraceStep, durationSec: number) {
    if (!this.currentLevel) return;

    // Sync collected/opened state
    const colGemSet = new Set(step.collectedGems);
    this.gemMeshes.forEach((m, k) => {
      m.visible = !colGemSet.has(k);
    });
    const colBonusSet = new Set(step.collectedBonus);
    this.bonusMeshes.forEach((m, k) => {
      m.visible = !colBonusSet.has(k);
    });
    const openDoorSet = new Set(step.openedDoors);
    this.doorVisuals.forEach((d, k) => {
      d.opened = openDoorSet.has(k);
    });

    const fromX = this.gridToWorldX(step.fromX);
    const fromZ = this.gridToWorldZ(step.fromY);
    const toX = this.gridToWorldX(step.toX);
    const toZ = this.gridToWorldZ(step.toY);
    const fromYaw = DIR_TO_YAW[step.fromDir];
    let toYaw = DIR_TO_YAW[step.toDir];

    // Shortest angular path
    let diff = toYaw - fromYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    toYaw = fromYaw + diff;

    if (step.justCollectedGem) {
      this.spawnParticles(toX, 0.55, toZ, 0x38bdf8, 16);
    }
    if (step.justCollectedBonus) {
      this.spawnParticles(toX, 0.65, toZ, 0xfde047, 18);
    }
    if (step.justOpenedDoor) {
      const [dx, dy] = step.justOpenedDoor.split(',').map(Number);
      this.spawnParticles(this.gridToWorldX(dx), 0.7, this.gridToWorldZ(dy), 0x4ade80, 18);
    }

    if (step.action === 'move') {
      this.setRobotMood('normal');
      this.activeAnim = {
        kind: 'move',
        elapsed: 0,
        duration: Math.max(0.14, durationSec * 0.88),
        fromX,
        fromZ,
        toX,
        toZ,
        fromYaw,
        toYaw,
      };
    } else if (step.action === 'turn_left' || step.action === 'turn_right') {
      this.setRobotMood('normal');
      this.activeAnim = {
        kind: 'turn',
        elapsed: 0,
        duration: Math.max(0.14, durationSec * 0.8),
        fromX: toX,
        fromZ: toZ,
        toX,
        toZ,
        fromYaw,
        toYaw,
      };
    } else if (step.action === 'collect' || step.action === 'unlock') {
      this.setRobotMood('happy');
      this.activeAnim = {
        kind: step.action === 'collect' ? 'collect' : 'unlock',
        elapsed: 0,
        duration: Math.max(0.16, durationSec * 0.85),
        fromX: toX,
        fromZ: toZ,
        toX,
        toZ,
        fromYaw: toYaw,
        toYaw,
      };
    } else if (
      step.action === 'bump_wall' ||
      step.action === 'out_of_bounds' ||
      step.action === 'door_locked' ||
      step.action === 'no_gem' ||
      step.action === 'fail_end' ||
      step.action === 'infinite_loop'
    ) {
      this.setRobotMood('oops');
      const d = DIR_DELTA[step.fromDir];
      this.activeAnim = {
        kind: 'bump',
        elapsed: 0,
        duration: 0.42,
        fromX,
        fromZ,
        toX: fromX + d.dx * 0.32,
        toZ: fromZ + d.dy * 0.32,
        fromYaw,
        toYaw: fromYaw,
      };
      this.spawnParticles(fromX, 0.7, fromZ, 0xf87171, 10);
    } else if (step.action === 'win') {
      this.setRobotMood('happy');
      this.activeAnim = {
        kind: 'win',
        elapsed: 0,
        duration: 0.85,
        fromX: toX,
        fromZ: toZ,
        toX,
        toZ,
        fromYaw: toYaw,
        toYaw: toYaw + Math.PI * 2,
      };
      this.spawnParticles(toX, 0.85, toZ, 0xfde047, 24);
    }
  }

  public resize() {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private afterDraw(cb: () => void) {
    if (this.disposed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop() {
    this.clock.start();

    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.getElapsedTime();

      this.updateScene(dt, t);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.renderer.render(this.scene, this.camera);
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private updateScene(dt: number, t: number) {
    // Smooth camera preset damping
    if (this.cameraTransitioning) {
      const k = 1 - Math.exp(-6.5 * dt);
      this.camera.position.lerp(_targetCamPos, k);
      this.controls.target.lerp(_targetLookAt, k);
      if (this.camera.position.distanceTo(_targetCamPos) < 0.04) {
        this.cameraTransitioning = false;
      }
    }

    // Gentle title screen diorama orbit
    if (this.idleDemoMode && !this.cameraTransitioning) {
      const r = 9.2;
      this.camera.position.set(Math.sin(t * 0.25) * r, 7.6, Math.cos(t * 0.25) * r);
      this.controls.target.set(0, 0.3, 0);
    }

    this.controls.update();

    // Animate Gems & Bonus Gems
    let idx = 0;
    this.gemMeshes.forEach((g) => {
      if (!g.visible) return;
      const fp = g.getObjectByName('floatPart');
      if (fp) {
        fp.rotation.y = t * 1.9 + idx;
        fp.position.y = 0.46 + Math.sin(t * 2.6 + idx) * 0.08;
      }
      idx++;
    });

    this.bonusMeshes.forEach((g) => {
      if (!g.visible) return;
      const fp = g.getObjectByName('floatPart');
      if (fp) {
        fp.rotation.y = -t * 2.4 + idx;
        fp.position.y = 0.58 + Math.sin(t * 3.1 + idx) * 0.1;
      }
      idx++;
    });

    // Animate Goal Flag waving
    if (this.flagPennant) {
      this.flagPennant.rotation.y = Math.sin(t * 4.5) * 0.2;
    }
    if (this.goalHalo) {
      const s = 1 + Math.sin(t * 3.2) * 0.08;
      this.goalHalo.scale.set(s, s, 1);
    }
    if (this.starfield) {
      this.starfield.rotation.y = t * 0.025;
    }

    // Animate Door retraction
    this.doorVisuals.forEach((d) => {
      const target = d.opened ? 1 : 0;
      d.openProgress = THREE.MathUtils.damp(d.openProgress, target, 8, dt);
      d.bars.position.y = -d.openProgress * 1.25;
      d.bars.visible = d.openProgress < 0.94;
    });

    // Animate Robot step kinematics or gentle idle breathing
    if (this.activeAnim) {
      const a = this.activeAnim;
      a.elapsed += dt;
      const u = Math.min(1, a.elapsed / a.duration);
      const ease = 1 - Math.pow(1 - u, 3);

      if (a.kind === 'move') {
        this.robot.root.position.x = THREE.MathUtils.lerp(a.fromX, a.toX, ease);
        this.robot.root.position.z = THREE.MathUtils.lerp(a.fromZ, a.toZ, ease);
        this.robot.root.rotation.y = a.toYaw;
        // Cute hop arc + squash-stretch
        const hop = Math.sin(u * Math.PI) * 0.34;
        this.robot.bodyGroup.position.y = hop;
        const stretch = 1 + Math.sin(u * Math.PI) * 0.08;
        this.robot.bodyGroup.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        this.robot.leftArm.rotation.x = Math.sin(u * Math.PI * 2) * 0.65;
        this.robot.rightArm.rotation.x = -Math.sin(u * Math.PI * 2) * 0.65;
      } else if (a.kind === 'turn') {
        this.robot.root.rotation.y = THREE.MathUtils.lerp(a.fromYaw, a.toYaw, ease);
        this.robot.bodyGroup.position.y = Math.sin(u * Math.PI) * 0.14;
      } else if (a.kind === 'collect' || a.kind === 'unlock') {
        this.robot.bodyGroup.position.y = Math.sin(u * Math.PI) * 0.38;
        this.robot.leftArm.rotation.x = -Math.sin(u * Math.PI) * 1.5;
        this.robot.rightArm.rotation.x = -Math.sin(u * Math.PI) * 1.5;
      } else if (a.kind === 'bump') {
        const bumpCurve = Math.sin(u * Math.PI);
        this.robot.root.position.x = THREE.MathUtils.lerp(a.fromX, a.toX, bumpCurve);
        this.robot.root.position.z = THREE.MathUtils.lerp(a.fromZ, a.toZ, bumpCurve);
        this.robot.bodyGroup.rotation.z = Math.sin(u * Math.PI * 5) * 0.18 * (1 - u);
      } else if (a.kind === 'win') {
        this.robot.root.rotation.y = THREE.MathUtils.lerp(a.fromYaw, a.toYaw, ease);
        this.robot.bodyGroup.position.y = Math.abs(Math.sin(u * Math.PI * 2)) * 0.48;
        this.robot.leftArm.rotation.x = -2.2;
        this.robot.rightArm.rotation.x = -2.2;
      }

      if (u >= 1) {
        if (a.kind !== 'bump') {
          this.robot.root.position.x = a.toX;
          this.robot.root.position.z = a.toZ;
        } else {
          this.robot.root.position.x = a.fromX;
          this.robot.root.position.z = a.fromZ;
        }
        this.robot.root.rotation.y = a.kind === 'win' ? a.fromYaw : a.toYaw;
        this.robot.bodyGroup.position.y = 0;
        this.robot.bodyGroup.rotation.z = 0;
        this.robot.bodyGroup.scale.set(1, 1, 1);
        this.robot.leftArm.rotation.x = 0;
        this.robot.rightArm.rotation.x = 0;
        this.activeAnim = null;
      }
    } else {
      // Idle cute breathing & friendly wave in title screen
      this.robot.bodyGroup.position.y = Math.sin(t * 2.8) * 0.03;
      this.robot.antennaTip.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      if (this.idleDemoMode) {
        this.robot.rightArm.rotation.x = -2.3 + Math.sin(t * 6) * 0.35;
        this.robot.leftArm.rotation.x = Math.sin(t * 2.2) * 0.18;
      } else {
        this.robot.leftArm.rotation.x = Math.sin(t * 2.2) * 0.08;
        this.robot.rightArm.rotation.x = -Math.sin(t * 2.2) * 0.08;
      }
    }

    // Update pooled particles
    for (const p of this.particles) {
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.vel.y -= 7.2 * dt;
          _v1.copy(p.vel).multiplyScalar(dt);
          p.mesh.position.add(_v1);
          p.mesh.rotation.x += 5 * dt;
          p.mesh.rotation.y += 6 * dt;
          const ratio = p.life / p.maxLife;
          p.mesh.scale.setScalar(Math.max(0.01, ratio));
        }
      }
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.clearWorld();
    this.contactShadowTex.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export type { CodingWorld3D as CodingWorld3DInstance };
export { _v2 };
