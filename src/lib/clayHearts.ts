declare const window: any;

export class ClayHearts {
  container: HTMLElement;
  hearts: any[];
  isPaused: boolean;
  scene: any;
  camera: any;
  renderer: any;
  geometry: any;
  materials: any[];
  resizeCallback: any;

  constructor(container: HTMLElement) {
    if (!container) {
      console.error("ClayHearts: Kein Container-Element übergeben!");
      return;
    }
    this.container = container;
    this.hearts = [];
    this.isPaused = false;

    const THREE = window.THREE;
    if (!THREE) {
      console.error("ClayHearts: Three.js ist nicht geladen!");
      return;
    }

    this._initScene(THREE);
    this._initLights(THREE);
    this._initGeometry(THREE);
    this._initMaterials(THREE);
    this._initResizeHandler();
    
    // Starte den Animations-Loop
    this._animate();
  }

  _initScene(THREE: any) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
    
    this.container.appendChild(this.renderer.domElement);
  }

  _initLights(THREE: any) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight.position.set(-3, 6, 4);
    this.scene.add(dirLight);
  }

  _initGeometry(THREE: any) {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(25, 25);
    heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0);
    heartShape.bezierCurveTo(-30, 0, -30, 35, -30, 35);
    heartShape.bezierCurveTo(-30, 55, -10, 77, 25, 95);
    heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35);
    heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0);
    heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25);

    const extrudeSettings = {
      depth: 6,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 5.5,
      bevelThickness: 5.5
    };

    this.geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    this.geometry.center();
    this.geometry.rotateZ(Math.PI);
  }

  _initMaterials(THREE: any) {
    this.materials = [
      new THREE.MeshStandardMaterial({
        color: 0xFF527B,
        roughness: 0.92,
        metalness: 0.0,
        flatShading: false
      }),
      new THREE.MeshStandardMaterial({
        color: 0xFF7195,
        roughness: 0.92,
        metalness: 0.0,
        flatShading: false
      }),
      new THREE.MeshStandardMaterial({
        color: 0xE83B65,
        roughness: 0.92,
        metalness: 0.0,
        flatShading: false
      })
    ];
  }

  _initResizeHandler() {
    this.resizeCallback = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.resizeCallback);
  }

  spawn(options: any = {}) {
    if (this.isPaused) return;

    const THREE = window.THREE;
    const selectedMat = this.materials[Math.floor(Math.random() * this.materials.length)];
    const mesh = new THREE.Mesh(this.geometry, selectedMat);

    const sizeScale = (Math.random() * 0.008 + 0.012) * (options.scaleMultiplier || 1);
    mesh.scale.set(sizeScale, sizeScale, sizeScale);

    const startX = options.x !== undefined ? options.x : (Math.random() - 0.5) * 12;
    const startY = options.y !== undefined ? options.y : -7;
    const startZ = options.z !== undefined ? options.z : (Math.random() - 0.5) * 3;
    mesh.position.set(startX, startY, startZ);

    mesh.userData = {
      velocityY: options.velocityY !== undefined ? options.velocityY : Math.random() * 0.06 + 0.04,
      velocityX: options.velocityX !== undefined ? options.velocityX : (Math.random() - 0.5) * 0.03,
      velocityZ: options.velocityZ !== undefined ? options.velocityZ : (Math.random() - 0.5) * 0.01,
      
      rotX: (Math.random() - 0.5) * 0.03,
      rotY: (Math.random() - 0.5) * 0.05,
      rotZ: (Math.random() - 0.5) * 0.02,
      
      life: 1.0,
      fadeSpeed: options.fadeSpeed || 0.005
    };

    this.scene.add(mesh);
    this.hearts.push(mesh);
  }

  explode(clientX: number, clientY: number) {
    const THREE = window.THREE;
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -(clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const force = Math.random() * 0.07 + 0.05;

      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 0.3,
        y: pos.y + (Math.random() - 0.5) * 0.3,
        z: pos.z + (Math.random() - 0.5) * 0.5,
        velocityY: Math.sin(Math.random() * Math.PI * 0.5 + 0.5) * force + 0.06,
        velocityX: Math.cos(angle) * force * 1.5,
        velocityZ: (Math.random() - 0.5) * 0.03,
        scaleMultiplier: 0.8 + Math.random() * 0.4,
        fadeSpeed: 0.008
      });
    }
  }

  _animate() {
    if (this.isPaused) return;
    requestAnimationFrame(() => this._animate());

    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      
      h.position.y += h.userData.velocityY;
      h.position.x += h.userData.velocityX;
      h.position.z += h.userData.velocityZ;

      h.rotation.x += h.userData.rotX;
      h.rotation.y += h.userData.rotY;
      h.rotation.z += h.userData.rotZ;

      h.userData.velocityX *= 0.98;
      h.userData.velocityZ *= 0.98;

      if (h.position.y > 6.5) {
        h.scale.multiplyScalar(0.9);
        if (h.scale.x < 0.001) {
          this.scene.remove(h);
          this.hearts.splice(i, 1);
          continue;
        }
      }

      h.userData.life -= h.userData.fadeSpeed;
      if (h.userData.life <= 0) {
        this.scene.remove(h);
        this.hearts.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.resizeCallback);
    this.isPaused = true;
    for (let h of this.hearts) {
      this.scene.remove(h);
    }
    this.hearts = [];
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
