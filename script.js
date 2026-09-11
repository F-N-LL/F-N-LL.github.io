// One shared WebGL renderer paints only the instrument plates in the viewport.
// All geometry and textures are authored here; no remote models are required.
async function startAtlas() {
  const THREE = await import("./vendor/three.module.min.js");
  const canvas = document.querySelector("#scene");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const TAU = Math.PI * 2;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  function texture(width, height, paint) {
    const surface = document.createElement("canvas");
    surface.width = width;
    surface.height = height;
    paint(surface.getContext("2d"), width, height);
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return map;
  }
  const metalMap = texture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c4a268";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = i % 3 ? "#e8cb9620" : "#49311418";
      ctx.fillRect((i * 73) % w, (i * 31) % h, 35 + (i % 65), 1);
    }
  });
  const brass = new THREE.MeshStandardMaterial({
    map: metalMap,
    color: 0xc3a471,
    metalness: 0.76,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });
  const darkBrass = new THREE.MeshStandardMaterial({
    color: 0x79603a,
    metalness: 0.65,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x493123,
    roughness: 0.48,
    metalness: 0.1,
  });
  const ink = new THREE.MeshStandardMaterial({
    color: 0x352e24,
    roughness: 0.6,
  });
  const red = new THREE.MeshStandardMaterial({
    color: 0x913d2c,
    roughness: 0.4,
    metalness: 0.3,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: 0xe7d7b3,
    roughness: 0.5,
    metalness: 0.15,
  });

  // Broad warm studio reflections make the brass readable on light parchment.
  const room = new THREE.Scene();
  room.background = new THREE.Color(0xc4bba7);
  for (const [x, y, z, sx, sy] of [
    [-4, 3, 1, 4, 5],
    [3, 4, -2, 3, 6],
    [1, -1, 5, 2, 5],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(sx, sy),
      new THREE.MeshBasicMaterial({ color: 0xfff5df, side: THREE.DoubleSide }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  pmrem.dispose();

  function mesh(parent, geometry, material = brass, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  }
  function rod(parent, from, to, radius = 0.045, material = brass) {
    const delta = to.clone().sub(from);
    const item = mesh(
      parent,
      new THREE.CylinderGeometry(radius, radius, delta.length(), 12),
      material,
    );
    item.position.copy(from).add(to).multiplyScalar(0.5);
    item.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
    return item;
  }
  function ring(parent, radius, thickness = 0.025, material = brass) {
    return mesh(
      parent,
      new THREE.TorusGeometry(radius, thickness, 8, 112),
      material,
    );
  }
  function screw(parent, x, y, z) {
    mesh(parent, new THREE.SphereGeometry(0.047, 10, 8), brass, x, y, z);
    mesh(
      parent,
      new THREE.BoxGeometry(0.048, 0.008, 0.01),
      ink,
      x,
      y,
      z + 0.045,
    );
  }
  function ticks(parent, radius, count = 120, start = 0, arc = TAU) {
    const instanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      darkBrass,
      count,
    );
    const transform = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = start + (i / count) * arc;
      transform.position.set(Math.sin(a) * radius, Math.cos(a) * radius, 0.024);
      transform.rotation.z = -a;
      transform.scale.set(0.009, i % 5 === 0 ? 0.115 : 0.05, 0.013);
      transform.updateMatrix();
      instanced.setMatrixAt(i, transform.matrix);
    }
    parent.add(instanced);
  }
  function band(parent, radius) {
    const g = new THREE.Group();
    parent.add(g);
    mesh(g, new THREE.RingGeometry(radius - 0.085, radius + 0.085, 128), brass);
    ring(g, radius - 0.085, 0.018);
    ring(g, radius + 0.085, 0.018);
    ticks(g, radius, 120);
    return g;
  }
  function base(parent, y = -2.1) {
    mesh(
      parent,
      new THREE.CylinderGeometry(0.81, 0.92, 0.12, 64),
      wood,
      0,
      y,
      0,
    );
    mesh(
      parent,
      new THREE.CylinderGeometry(0.69, 0.82, 0.08, 64),
      brass,
      0,
      y + 0.1,
      0,
    );
    const profile = [
      [0.39, 0],
      [0.35, 0.08],
      [0.23, 0.14],
      [0.16, 0.26],
      [0.13, 0.43],
      [0.22, 0.52],
      [0.22, 0.59],
      [0.12, 0.67],
    ].map(([x, z]) => new THREE.Vector2(x, z));
    mesh(parent, new THREE.LatheGeometry(profile, 48), brass, 0, y + 0.14, 0);
  }
  function dialMap(seal = false) {
    return texture(1024, 1024, (ctx, w, h) => {
      ctx.fillStyle = seal ? "#b99351" : "#e5d4ad";
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.strokeStyle = "#6b5738";
      ctx.fillStyle = "#493c29";
      ctx.lineWidth = 2;
      for (const r of [460, 444, 374, 180, 70]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 120; i++) {
        const a = (i * TAU) / 120;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -435);
        ctx.lineTo(0, i % 5 === 0 ? -405 : -420);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * TAU) / 8);
        const r = i % 2 ? 215 : 325;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(-30, -35);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "#7d805f" : "#8f4935";
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(30, -35);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = "#e7d6ad";
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#443827";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "48px Georgia";
      for (const [label, x, y] of [
        ["N", 0, -350],
        ["E", 350, 0],
        ["S", 0, 350],
        ["W", -350, 0],
      ])
        ctx.fillText(label, x, y);
      ctx.font = "17px Georgia";
      ctx.fillText(seal ? "D · F · C" : "ARS NAVIGANDI", 0, 485);
    });
  }
  const continents = [
    [
      [-165, 64],
      [-145, 70],
      [-126, 62],
      [-105, 73],
      [-70, 58],
      [-54, 48],
      [-66, 40],
      [-81, 25],
      [-88, 16],
      [-105, 22],
      [-118, 33],
      [-130, 51],
      [-160, 58],
    ],
    [
      [-81, 12],
      [-61, 9],
      [-45, -2],
      [-35, -12],
      [-46, -25],
      [-55, -39],
      [-68, -55],
      [-76, -35],
      [-72, -14],
    ],
    [
      [-18, 35],
      [3, 37],
      [17, 32],
      [34, 31],
      [50, 11],
      [42, -10],
      [31, -30],
      [19, -35],
      [9, -17],
      [-7, 5],
      [-16, 15],
    ],
    [
      [-10, 36],
      [-3, 58],
      [20, 71],
      [39, 61],
      [61, 68],
      [104, 76],
      [144, 62],
      [177, 54],
      [144, 43],
      [126, 22],
      [105, 2],
      [82, 9],
      [73, 24],
      [48, 14],
      [33, 35],
      [22, 41],
      [3, 44],
    ],
    [
      [112, -12],
      [135, -11],
      [152, -23],
      [147, -39],
      [126, -34],
      [114, -24],
    ],
    [
      [-51, 60],
      [-24, 74],
      [-35, 83],
      [-57, 79],
      [-65, 68],
    ],
  ];
  const globeMap = texture(1536, 768, (ctx, w, h) => {
    ctx.fillStyle = "#c6b88e";
    ctx.fillRect(0, 0, w, h);
    const project = ([lon, lat]) => [
      ((lon + 180) / 360) * w,
      ((90 - lat) / 180) * h,
    ];
    continents.forEach((points, index) => {
      ctx.beginPath();
      points.forEach((point, i) => {
        const [x, y] = project(point);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = index % 2 ? "#8c9874" : "#9b9d78";
      ctx.fill();
      ctx.strokeStyle = "#775d39";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#9d654432";
      ctx.stroke();
    });
    ctx.strokeStyle = "#65583f55";
    ctx.lineWidth = 1;
    for (let lon = 0; lon < w; lon += w / 24) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, h);
      ctx.stroke();
    }
    for (let lat = 0; lat < h; lat += h / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(w, lat);
      ctx.stroke();
    }
    ctx.font = "22px Georgia";
    ctx.fillStyle = "#55462d";
    ctx.textAlign = "center";
    ctx.fillText("OCEANUS", 475, 360);
    ctx.fillText("DATARUM", 475, 395);
    ctx.fillText("TERRA INCOGNITA", 1070, 585);
    ctx.strokeStyle = "#8e483d";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.moveTo(390, 315);
    ctx.bezierCurveTo(540, 220, 645, 380, 740, 295);
    ctx.stroke();
  });
  const globeMaterial = new THREE.MeshStandardMaterial({
    map: globeMap,
    roughness: 0.7,
    metalness: 0.06,
  });
  const shadowMap = texture(128, 128, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(
      w / 2,
      h / 2,
      2,
      w / 2,
      h / 2,
      w / 2,
    );
    gradient.addColorStop(0, "rgba(62,39,12,.32)");
    gradient.addColorStop(0.4, "rgba(62,39,12,.18)");
    gradient.addColorStop(1, "rgba(62,39,12,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
  const terminalMap = texture(640, 360, (ctx, w, h) => {
    ctx.fillStyle = "#182a28";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ad9b60";
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.font = "22px monospace";
    ctx.fillStyle = "#d5bd78";
    ctx.fillText("ORBITAL RELAY / 07", 38, 62);
    ctx.fillStyle = "#b16a4c";
    ctx.fillText("SIGNAL: STABLE", 38, 102);
    ctx.fillStyle = "#c8d0a0";
    ctx.fillText("▰ ▰ ▰ ▱ ▱ ▱ ▰", 38, 160);
    ctx.fillText("DATA      98.4%", 38, 210);
    ctx.fillText("LAT       38.336°", 38, 250);
    ctx.fillText("VECTOR    07.21 / ∞", 38, 290);
    ctx.strokeStyle = "#a76445";
    ctx.beginPath();
    ctx.moveTo(350, 285);
    ctx.lineTo(575, 120);
    ctx.stroke();
    ctx.fillStyle = "#c9b36d";
    ctx.beginPath();
    ctx.arc(575, 120, 8, 0, TAU);
    ctx.fill();
  });

  function armillary(root) {
    base(root, -2.3);
    const cage = new THREE.Group();
    cage.position.y = 0.25;
    cage.rotation.set(0.12, 0, -0.27);
    root.add(cage);
    const fixed = band(cage, 1.85);
    fixed.rotation.y = 0.15;
    const equator = band(cage, 1.7);
    equator.rotation.x = Math.PI / 2;
    const orbit = band(cage, 1.58);
    orbit.rotation.set(0.6, 0.5, 0.35);
    const meridian = ring(cage, 1.53, 0.026);
    meridian.rotation.y = Math.PI / 2;
    for (const lat of [-0.68, 0.68]) {
      const r = ring(cage, 1.22, 0.018);
      r.rotation.x = Math.PI / 2;
      r.position.y = lat;
    }
    rod(cage, V(0, -2.0, 0), V(0, 2, 0), 0.045);
    mesh(cage, new THREE.SphereGeometry(0.13, 20, 12), brass, 0, 2.04, 0);
    const earth = mesh(
      cage,
      new THREE.SphereGeometry(0.78, 48, 32),
      globeMaterial,
    );
    const network = new THREE.Group();
    cage.add(network);
    const nodes = [];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996,
        y = 1 - i / 6.5,
        r = Math.sqrt(1 - y * y);
      const point = V(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(1.05);
      nodes.push(point);
      mesh(
        network,
        new THREE.SphereGeometry(0.045, 10, 8),
        i % 3 ? brass : red,
        ...point.toArray(),
      );
    }
    for (let i = 0; i < nodes.length; i++)
      rod(network, nodes[i], nodes[(i + 3) % nodes.length], 0.007, darkBrass);
    const bead = mesh(
      orbit,
      new THREE.SphereGeometry(0.075, 16, 12),
      red,
      1.58,
      0,
      0,
    );
    const terminal = new THREE.Group();
    terminal.position.set(-1.58, -1.32, 0.45);
    terminal.rotation.set(-0.18, 0.2, 0.12);
    cage.add(terminal);
    mesh(terminal, new THREE.BoxGeometry(0.9, 0.56, 0.12), darkBrass);
    mesh(
      terminal,
      new THREE.PlaneGeometry(0.74, 0.41),
      new THREE.MeshStandardMaterial({
        map: terminalMap,
        emissive: 0x132622,
        emissiveIntensity: 0.5,
      }),
      0,
      0,
      0.075,
    );
    rod(terminal, V(-0.27, -0.35, 0), V(-0.27, -0.64, 0), 0.035, brass);
    rod(terminal, V(0.27, -0.35, 0), V(0.27, -0.64, 0), 0.035, brass);
    return (t) => {
      earth.rotation.y = t * 0.09;
      orbit.rotation.y = 0.5 + Math.sin(t * 0.12) * 0.25;
      network.rotation.y = t * 0.04;
      bead.position.set(
        Math.cos(t * 0.2) * 1.58,
        Math.sin(t * 0.2) * 1.58,
        0.04,
      );
    };
  }
  function compass(root, seal = false) {
    const g = new THREE.Group();
    root.add(g);
    g.rotation.set(-0.42, 0.15, -0.28);
    const body = mesh(g, new THREE.CylinderGeometry(1.5, 1.5, 0.26, 96), brass);
    body.rotation.x = Math.PI / 2;
    const face = mesh(
      g,
      new THREE.CircleGeometry(1.37, 96),
      new THREE.MeshStandardMaterial({
        map: dialMap(seal),
        roughness: 0.6,
        metalness: seal ? 0.45 : 0.02,
      }),
      0,
      0,
      0.143,
    );
    ring(g, 1.46, 0.055).position.z = 0.14;
    ring(g, 1.39, 0.022, darkBrass).position.z = 0.17;
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      screw(g, Math.sin(a) * 1.44, Math.cos(a) * 1.44, 0.18);
    }
    const bail = ring(g, 0.24, 0.057);
    bail.position.y = 1.83;
    mesh(g, new THREE.BoxGeometry(0.21, 0.25, 0.19), brass, 0, 1.53, 0);
    if (seal) {
      face.material.metalness = 0.45;
      return (t) => {
        g.rotation.z = -0.28 + Math.sin(t * 0.15) * 0.08;
      };
    }
    const needle = new THREE.Group();
    needle.position.z = 0.23;
    g.add(needle);
    for (const [direction, mat] of [
      [1, red],
      [-1, ivory],
    ]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.12 * direction);
      shape.lineTo(-0.12, 0);
      shape.lineTo(0, -0.18 * direction);
      shape.lineTo(0.12, 0);
      shape.closePath();
      mesh(
        needle,
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.035,
          bevelEnabled: true,
          bevelSize: 0.015,
          bevelThickness: 0.01,
          bevelSegments: 1,
          steps: 1,
        }),
        mat,
      );
    }
    mesh(g, new THREE.SphereGeometry(0.115, 20, 12), brass, 0, 0, 0.32);
    return (t) => {
      needle.rotation.z = 0.3 + Math.sin(t * 0.45) * 0.14;
    };
  }
  function sextant(root) {
    const g = new THREE.Group();
    root.add(g);
    g.position.y = 0.5;
    g.rotation.set(-0.16, -0.23, 0.27);
    const arc = new THREE.Shape();
    const a0 = -2.8,
      a1 = -0.35;
    arc.absarc(0, 0.75, 2.25, a0, a1, false);
    arc.absarc(0, 0.75, 1.98, a1, a0, true);
    arc.closePath();
    mesh(
      g,
      new THREE.ExtrudeGeometry(arc, {
        depth: 0.13,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.018,
        bevelSegments: 2,
        steps: 1,
      }),
      brass,
    );
    const pivot = V(0, 0.75, 0.08);
    for (const a of [a0, a0 + 0.6, -1.58, a1 - 0.5, a1])
      rod(
        g,
        pivot,
        V(Math.cos(a) * 2.09, 0.75 + Math.sin(a) * 2.09, 0.08),
        0.055,
      );
    for (let i = 0; i < 70; i++) {
      const a = a0 + ((a1 - a0) * i) / 69;
      rod(
        g,
        V(Math.cos(a) * 2.19, 0.75 + Math.sin(a) * 2.19, 0.155),
        V(
          Math.cos(a) * (i % 5 ? 2.12 : 2.04),
          0.75 + Math.sin(a) * (i % 5 ? 2.12 : 2.04),
          0.155,
        ),
        0.008,
        darkBrass,
      );
    }
    const arm = new THREE.Group();
    arm.position.copy(pivot);
    g.add(arm);
    rod(arm, V(0, 0, 0.16), V(0.3, -2.16, 0.16), 0.09);
    screw(g, 0, 0.75, 0.28);
    rod(g, V(-1.22, 0.18, 0.35), V(0.65, 0.18, 0.35), 0.13, wood);
    for (const x of [-1.23, -0.98, 0.1, 0.65])
      rod(g, V(x - 0.045, 0.18, 0.35), V(x + 0.045, 0.18, 0.35), 0.16);
    const lens = mesh(
      g,
      new THREE.CircleGeometry(0.115, 24),
      new THREE.MeshStandardMaterial({
        color: 0x5d827e,
        metalness: 0.55,
        roughness: 0.12,
      }),
      0.705,
      0.18,
      0.35,
    );
    lens.rotation.y = Math.PI / 2;
    mesh(g, new THREE.BoxGeometry(0.35, 0.44, 0.09), brass, 0.32, 0.73, 0.25);
    mesh(g, new THREE.BoxGeometry(0.26, 0.32, 0.015), ivory, 0.32, 0.73, 0.303);
    rod(g, V(-0.45, -0.1, -0.2), V(-0.6, -1.08, -0.2), 0.12, wood);
    return (t) => {
      arm.rotation.z = Math.sin(t * 0.25) * 0.055;
    };
  }
  function globe(root) {
    base(root, -1.85);
    const tilt = new THREE.Group();
    tilt.position.y = 0.2;
    tilt.rotation.z = -0.3;
    root.add(tilt);
    const meridian = band(tilt, 1.43);
    meridian.rotation.y = 0.22;
    rod(tilt, V(0, -1.6, 0), V(0, 1.6, 0), 0.038);
    const sphere = mesh(
      tilt,
      new THREE.SphereGeometry(1.24, 48, 32),
      globeMaterial,
    );
    const horizon = ring(root, 1.6, 0.045);
    horizon.rotation.x = Math.PI / 2;
    horizon.position.y = -0.1;
    const satellite = new THREE.Group();
    satellite.position.set(1.65, 1.05, 0.1);
    root.add(satellite);
    mesh(satellite, new THREE.BoxGeometry(0.34, 0.2, 0.18), darkBrass);
    mesh(
      satellite,
      new THREE.BoxGeometry(0.5, 0.11, 0.015),
      new THREE.MeshStandardMaterial({
        color: 0x526754,
        metalness: 0.25,
        roughness: 0.4,
      }),
      -0.42,
      0,
      0,
    );
    mesh(
      satellite,
      new THREE.BoxGeometry(0.5, 0.11, 0.015),
      new THREE.MeshStandardMaterial({
        color: 0x526754,
        metalness: 0.25,
        roughness: 0.4,
      }),
      0.42,
      0,
      0,
    );
    rod(satellite, V(0, 0.1, 0), V(0, 0.38, 0), 0.018, brass);
    mesh(satellite, new THREE.SphereGeometry(0.045, 10, 8), red, 0, 0.43, 0);
    return (t) => {
      sphere.rotation.y = 0.55 + t * 0.055;
      satellite.rotation.z = t * 0.16;
      satellite.position.set(
        Math.cos(t * 0.16) * 1.65,
        1.05 + Math.sin(t * 0.16) * 0.28,
        0.1,
      );
    };
  }
  const builders = {
    armillary,
    compass,
    sextant,
    globe,
    seal: (root) => compass(root, true),
  };
  const plates = [...document.querySelectorAll("[data-instrument]")].map(
    (element) => {
      const scene = new THREE.Scene();
      scene.environment = environment.texture;
      scene.add(new THREE.HemisphereLight(0xfff6e6, 0x887557, 0.9));
      const sun = new THREE.DirectionalLight(0xfff0d0, 2);
      sun.position.set(-3, 5, 6);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xffffff, 1.5);
      rim.position.set(4, 1, -3);
      scene.add(rim);
      const root = new THREE.Group();
      scene.add(root);
      const kind = element.dataset.instrument;
      root.rotation.set(0.12, -0.22, 0);
      const update = builders[kind](root);
      const standing = kind === "armillary" || kind === "globe";
      mesh(
        scene,
        new THREE.PlaneGeometry(standing ? 2.6 : 3.7, standing ? 0.45 : 3.4),
        new THREE.MeshBasicMaterial({
          map: shadowMap,
          transparent: true,
          depthWrite: false,
        }),
        0.1,
        standing ? (kind === "armillary" ? -2.37 : -1.93) : -0.15,
        -2,
      );
      const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);
      camera.position.set(0, 0.1, 10);
      camera.lookAt(0, 0.1, 0);
      return {
        element,
        scene,
        root,
        camera,
        update,
        extent:
          kind === "armillary"
            ? 5.6
            : kind === "compass" || kind === "seal"
              ? 4.4
              : 5.1,
      };
    },
  );
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = preference.matches,
    frame = 0,
    last = 0,
    time = 0,
    dirty = true;
  const pointer = { x: 0, y: 0 };
  const toggle = document.querySelector("#motion-toggle");
  toggle.hidden = false;
  function syncToggle() {
    toggle.textContent = paused ? "Animate instruments" : "Pause instruments";
    toggle.setAttribute("aria-pressed", String(paused));
  }
  function requestDraw() {
    dirty = true;
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    requestDraw();
  }
  function draw(now) {
    frame = 0;
    if (document.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!paused) time += delta;
    if (!paused || dirty) {
      dirty = false;
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);
      for (const plate of plates) {
        const r = plate.element.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= innerHeight || !r.width || !r.height)
          continue;
        const aspect = r.width / r.height;
        const height = plate.extent / Math.min(1, aspect);
        plate.camera.left = (-height * aspect) / 2;
        plate.camera.right = (height * aspect) / 2;
        plate.camera.top = height / 2;
        plate.camera.bottom = -height / 2;
        plate.camera.updateProjectionMatrix();
        if (!paused) {
          plate.root.rotation.y = -0.22 + pointer.x * 0.09;
          plate.root.rotation.x = 0.12 + pointer.y * 0.045;
        }
        plate.update(time);
        renderer.setViewport(r.left, innerHeight - r.bottom, r.width, r.height);
        renderer.setScissor(
          Math.max(0, r.left),
          Math.max(0, innerHeight - r.bottom),
          Math.min(r.right, innerWidth) - Math.max(0, r.left),
          Math.min(r.bottom, innerHeight) - Math.max(0, r.top),
        );
        renderer.render(plate.scene, plate.camera);
      }
    }
    if (!paused) frame = requestAnimationFrame(draw);
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    syncToggle();
    requestDraw();
  });
  preference.addEventListener("change", (event) => {
    paused = event.matches;
    syncToggle();
    requestDraw();
  });
  addEventListener(
    "pointermove",
    (event) => {
      if (paused) return;
      pointer.x = (event.clientX / innerWidth) * 2 - 1;
      pointer.y = (event.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  addEventListener("resize", resize);
  addEventListener("scroll", requestDraw, { passive: true });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestDraw();
  });
  const details = document.querySelector("details");
  if (details) details.addEventListener("toggle", requestDraw);
  new ResizeObserver(requestDraw).observe(document.body);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    paused = true;
    document.body.classList.remove("webgl-ready");
    toggle.hidden = true;
  });
  document.body.classList.add("webgl-ready");
  syncToggle();
  resize();
}
startAtlas().catch((error) => {
  // The atlas and all navigation remain usable if WebGL is unavailable.
  document.body.classList.remove("webgl-ready");
  document.querySelector("#scene").hidden = true;
  document.querySelector("#motion-toggle").hidden = true;
  console.warn("Atlas instruments unavailable:", error);
});
