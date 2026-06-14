const container = document.querySelector("#hero3d");

if (container && window.THREE) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "high-performance"
  });

  const pointer = new THREE.Vector2(0, 0);
  const rig = new THREE.Group();
  const clock = new THREE.Clock();
  const screens = [];
  const beams = [];
  let isVisible = true;
  let frameId = null;
  let lastFrameTime = 0;

  camera.position.set(0, 1.2, 8);
  scene.add(rig);

  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.34));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(3.5, 4.2, 5);
  scene.add(keyLight);

  const blueLight = new THREE.PointLight(0x5d7fa8, 1.55, 14);
  blueLight.position.set(-3.2, 1.3, 3.6);
  scene.add(blueLight);

  const orangeLight = new THREE.PointLight(0xd99a45, 1.35, 12);
  orangeLight.position.set(3.4, -1.2, 2.4);
  scene.add(orangeLight);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x171c1e,
    metalness: 0.72,
    roughness: 0.42
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x07090a,
    metalness: 0.6,
    roughness: 0.38
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x26384a,
    emissive: 0x182c3f,
    emissiveIntensity: 0.34,
    metalness: 0.36,
    roughness: 0.26,
    transparent: true,
    opacity: 0.74
  });
  const orangeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd99a45,
    emissive: 0x5a3412,
    emissiveIntensity: 0.55,
    metalness: 0.35,
    roughness: 0.3
  });
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x6d8fb8,
    transparent: true,
    opacity: 0.24
  });

  function roundedBox(width, height, depth, radius, smoothness) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: smoothness,
      bevelSize: radius * 0.24,
      bevelThickness: radius * 0.18
    }).center();
  }

  function makeScreen(x, y, z, rotationY, accentMaterial) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(roundedBox(2.15, 1.18, 0.08, 0.12, 2), bodyMaterial);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.92), glassMaterial);
    const tally = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), accentMaterial);
    const barA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.03), lineMaterial);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.035, 0.03), lineMaterial);

    panel.position.z = 0.07;
    tally.position.set(-0.72, 0.48, 0.11);
    barA.position.set(0.05, -0.12, 0.12);
    barB.position.set(0, -0.26, 0.12);

    group.add(frame, panel, tally, barA, barB);
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    group.userData.baseY = y;
    screens.push(group);
    rig.add(group);
    return group;
  }

  function makeCamera(x, y, z, rotationY) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(roundedBox(1.35, 0.72, 0.82, 0.1, 2), bodyMaterial);
    const lensOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.58, 24), darkMaterial);
    const lensGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 24), glassMaterial);
    const topHandle = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.18), darkMaterial);
    const sideGrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.34), orangeMaterial);

    lensOuter.rotation.x = Math.PI / 2;
    lensOuter.position.z = 0.63;
    lensGlass.rotation.x = Math.PI / 2;
    lensGlass.position.z = 0.94;
    topHandle.position.set(0, 0.48, -0.08);
    sideGrip.position.set(0.78, -0.02, 0.05);

    group.add(body, lensOuter, lensGlass, topHandle, sideGrip);
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    group.userData.baseY = y;
    rig.add(group);
    return group;
  }

  function makeBeam(from, to, radius) {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 8, 1, true),
      lineMaterial.clone()
    );
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

    beam.position.copy(midpoint);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    beam.userData.baseOpacity = 0.22 + Math.random() * 0.18;
    beams.push(beam);
    rig.add(beam);
  }

  makeScreen(-2.45, 1.05, 0.1, 0.36, orangeMaterial);
  makeScreen(0.15, 1.52, -0.35, 0.02, glassMaterial);
  makeScreen(2.58, 0.86, 0.22, -0.34, orangeMaterial);
  makeScreen(-1.35, -0.84, 0.52, 0.24, glassMaterial);
  makeScreen(1.55, -0.72, 0.45, -0.24, orangeMaterial);

  const mainCameraModel = makeCamera(0.12, 0.98, 2.15, -0.08);
  mainCameraModel.scale.setScalar(1.32);

  const cameraHub = new THREE.Vector3(0.12, 0.98, 2.15);
  makeBeam(new THREE.Vector3(-2.45, 1.05, 0.1), cameraHub, 0.01);
  makeBeam(new THREE.Vector3(2.58, 0.86, 0.22), cameraHub, 0.01);
  makeBeam(new THREE.Vector3(0.15, 1.52, -0.35), cameraHub, 0.008);
  makeBeam(new THREE.Vector3(-1.35, -0.84, 0.52), cameraHub, 0.008);
  makeBeam(new THREE.Vector3(1.55, -0.72, 0.45), cameraHub, 0.008);

  const particleGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 56; i += 1) {
    positions.push((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4.4, (Math.random() - 0.5) * 3.2);
  }
  particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xc7a45b,
      size: 0.026,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    })
  );
  rig.add(particles);

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
    renderer.setSize(width, height, false);
  }

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function animate(now = 0) {
    if (!isVisible) {
      frameId = null;
      return;
    }

    frameId = requestAnimationFrame(animate);

    if (now - lastFrameTime < 33) {
      return;
    }

    lastFrameTime = now;
    const elapsed = clock.getElapsedTime();
    const motion = prefersReducedMotion ? 0 : 1;

    rig.rotation.y += (pointer.x * 0.13 - rig.rotation.y) * 0.035;
    rig.rotation.x += (-pointer.y * 0.06 - rig.rotation.x) * 0.035;
    rig.position.y = Math.sin(elapsed * 0.6) * 0.05 * motion;

    screens.forEach((screen, index) => {
      screen.position.y = screen.userData.baseY + Math.sin(elapsed * 0.75 + index) * 0.08 * motion;
      screen.rotation.z = Math.sin(elapsed * 0.52 + index * 1.7) * 0.025 * motion;
    });

    mainCameraModel.rotation.z = Math.sin(elapsed * 0.7) * 0.035 * motion;
    mainCameraModel.position.y = mainCameraModel.userData.baseY + Math.sin(elapsed * 0.9) * 0.06 * motion;
    particles.rotation.y = elapsed * 0.045 * motion;

    beams.forEach((beam, index) => {
      beam.material.opacity = beam.userData.baseOpacity + Math.sin(elapsed * 1.8 + index) * 0.08 * motion;
    });

    renderer.render(scene, camera);
  }

  function start() {
    if (!frameId) {
      clock.start();
      frameId = requestAnimationFrame(animate);
    }
  }

  function stop() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) {
      start();
    } else {
      stop();
    }
  }, { threshold: 0.02 });

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  observer.observe(container);
  resize();
  renderer.render(scene, camera);
  document.body.classList.add("three-ready");
  start();
}
