const fs = require('fs');
const path = require('path');

const OUT_DIR = '/Users/narojushyamprasad/.gemini/antigravity/brain/adcda392-ca20-4558-ab0f-ccd054cf8a6c/scratch';

async function main() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const page = tabs.find((t) => t.url.includes('5173') && t.type === 'page');
  if (!page) throw new Error('No page on port 5173');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res) => (ws.onopen = res));

  let id = 1;
  const errors = [];
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.text + ': ' + (data.params.exceptionDetails.exception?.description || ''));
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      errors.push(data.params.args.map((a) => a.value || a.description).join(' '));
    }
  });

  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const curId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error('Eval error: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  async function screenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', outPath);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.reload');
  await sleep(4500);
  errors.length = 0;
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  // Dismiss character modal (Remy)
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const remy = btns.find((b) => b.textContent.includes('Remy'));
    if (remy) remy.click();
    const start = btns.find((b) => b.textContent.includes('Start Exploring'));
    if (start) start.click();
    if (window.__toggleHUD) window.__toggleHUD(true);
  })()`);
  await sleep(1500);

  const report = { gameplay: {}, performance: {}, errors: [] };

  // =========================================================================
  // PART 1: MANDATORY GAMEPLAY VERIFICATION (Real rAF loop running!)
  // =========================================================================
  console.log('\n=== PART 1: MANDATORY GAMEPLAY VERIFICATION ===');

  // 1. Pointer Lock & Escape
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 360, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 640, y: 360, button: 'left', clickCount: 1 });
  await sleep(300);
  const pointerLockStateAfterClick = await evaluate(`({
    pointerLockElement: !!document.pointerLockElement,
    isPointerLocked: window.__gameEngine.cameraController.isPointerLocked,
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' });
  await sleep(200);
  const pointerLockStateAfterEsc = await evaluate(`({
    pointerLockElement: !!document.pointerLockElement,
    isPointerLocked: window.__gameEngine.cameraController.isPointerLocked,
  })`);
  report.gameplay.pointerLockAndEscape = {
    afterClick: pointerLockStateAfterClick,
    afterEscape: pointerLockStateAfterEsc,
  };
  console.log('Pointer Lock & Escape:', JSON.stringify(report.gameplay.pointerLockAndEscape));

  // 2. Mouse drag / horizontal & vertical mouse movement
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.resetPlayerPosition();
  })()`);
  await sleep(400);
  const preMouse = await evaluate(`({
    theta: window.__gameEngine.cameraController.theta,
    pitch: window.__gameEngine.cameraController.pitch,
  })`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 360, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 760, y: 260, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 760, y: 260, button: 'left', clickCount: 1 });
  await sleep(300);
  const postMouse = await evaluate(`({
    theta: window.__gameEngine.cameraController.theta,
    pitch: window.__gameEngine.cameraController.pitch,
  })`);
  report.gameplay.mouseLook = {
    preMouse,
    postMouse,
    deltaTheta: Number((postMouse.theta - preMouse.theta).toFixed(4)),
    deltaPitch: Number((postMouse.pitch - preMouse.pitch).toFixed(4)),
    passed: postMouse.theta < preMouse.theta && postMouse.pitch > preMouse.pitch,
  };
  console.log('Mouse Look:', JSON.stringify(report.gameplay.mouseLook));

  // 3. WASD movement + Sprinting + Jumping
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyR', key: 'r' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyR', key: 'r' });
  await sleep(400);

  // Walk W
  const preW = await evaluate(`window.__gameEngine.player.getPosition()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(700);
  const walkSpeedSample = await evaluate(`window.__gameEngine.player.currentSpeed`);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await sleep(200);
  const postW = await evaluate(`window.__gameEngine.player.getPosition()`);

  // Sprint Shift + W
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(800);
  const sprintState = await evaluate(`({
    speed: window.__gameEngine.player.currentSpeed,
    isSprinting: window.__gameEngine.player.isSprinting,
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' });
  await sleep(300);

  // Jump (Space)
  const preJumpY = await evaluate(`window.__gameEngine.player.getPosition().y`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ' });
  let peakY = preJumpY;
  let sawAirborne = false;
  for (let i = 0; i < 20; i++) {
    await sleep(50);
    const st = await evaluate(`({ y: window.__gameEngine.player.getPosition().y, g: window.__gameEngine.player.isGrounded })`);
    if (st.y > peakY) peakY = st.y;
    if (!st.g) sawAirborne = true;
  }
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' });
  await sleep(400);
  const landedState = await evaluate(`({ y: window.__gameEngine.player.getPosition().y, g: window.__gameEngine.player.isGrounded })`);

  // A and D strafe
  const preA = await evaluate(`window.__gameEngine.player.getPosition()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyA', key: 'a' });
  await sleep(500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a' });
  await sleep(150);
  const postA = await evaluate(`window.__gameEngine.player.getPosition()`);

  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  await sleep(500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  await sleep(150);
  const postD = await evaluate(`window.__gameEngine.player.getPosition()`);

  // S backward
  const preS = await evaluate(`window.__gameEngine.player.getPosition()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' });
  await sleep(500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' });
  await sleep(150);
  const postS = await evaluate(`window.__gameEngine.player.getPosition()`);

  report.gameplay.locomotion = {
    walkDeltaZ: Number((postW.z - preW.z).toFixed(3)),
    walkSpeedSample: Number(walkSpeedSample.toFixed(2)),
    sprintSpeedSample: Number(sprintState.speed.toFixed(2)),
    isSprinting: sprintState.isSprinting,
    jumpPreY: Number(preJumpY.toFixed(3)),
    jumpPeakY: Number(peakY.toFixed(3)),
    jumpDeltaY: Number((peakY - preJumpY).toFixed(3)),
    sawAirborne,
    landedGrounded: landedState.g,
    landedY: Number(landedState.y.toFixed(3)),
    strafeADeltaX: Number((postA.x - preA.x).toFixed(3)),
    strafeDDeltaX: Number((postD.x - postA.x).toFixed(3)),
    backSDeltaZ: Number((postS.z - preS.z).toFixed(3)),
  };
  console.log('Locomotion / Sprint / Jump:', JSON.stringify(report.gameplay.locomotion));

  // 4. R Reset verification
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyR', key: 'r' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyR', key: 'r' });
  await sleep(400);
  const resetPos = await evaluate(`({
    pos: window.__gameEngine.player.getPosition(),
    theta: Number(window.__gameEngine.cameraController.theta.toFixed(3)),
  })`);
  report.gameplay.resetKeyR = {
    pos: resetPos.pos,
    theta: resetPos.theta,
    passed: Math.abs(resetPos.pos.x - 25) < 0.2 && Math.abs(resetPos.pos.z + 184) < 0.2 && Math.abs(resetPos.theta - Math.PI) < 0.1,
  };
  console.log('Key R Reset:', JSON.stringify(report.gameplay.resetKeyR));

  // 5. Ground & Building Collision (Main Gate East Pillar at x=32.35, z=-172.0, width=1.1, depth=1.0 -> N face at z=-172.5)
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.teleportPlayer(32.35, 1.0, -174.5, 0);
    ge.cameraController.snapView(Math.PI, 0.1, 3.8, { x: 32.35, y: 1.42, z: -174.5 });
  })()`);
  await sleep(300);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(1500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await sleep(200);
  const pillarCollisionPos = await evaluate(`window.__gameEngine.player.getPosition()`);
  await screenshot('verify_building_collision.png');
  report.gameplay.buildingCollision = {
    pillarCenterZ: -172.0,
    pillarNorthFaceZ: -172.5,
    playerStoppedAtZ: Number(pillarCollisionPos.z.toFixed(3)),
    playerY: Number(pillarCollisionPos.y.toFixed(3)),
    passed: pillarCollisionPos.z <= -172.4 && pillarCollisionPos.y > 0.5 && pillarCollisionPos.y < 1.2,
  };
  console.log('Building/Ground Collision:', JSON.stringify(report.gameplay.buildingCollision));

  // 6. Bus Collision (Static Bus 02 at x=50.25, z=-164.2, depth 2.8m -> south face at z=-162.8)
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.teleportPlayer(50.25, 1.0, -160.5, Math.PI);
    ge.cameraController.snapView(0.0, 0.1, 4.5, { x: 50.25, y: 1.42, z: -160.5 });
  })()`);
  await sleep(300);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(1500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await sleep(200);
  const busCollisionPos = await evaluate(`window.__gameEngine.player.getPosition()`);
  await screenshot('verify_bus_collision.png');
  report.gameplay.busCollision = {
    bus02CenterZ: -164.2,
    bus02SouthFaceZ: -162.8,
    playerStoppedAtZ: Number(busCollisionPos.z.toFixed(3)),
    passed: busCollisionPos.z >= -163.0 && busCollisionPos.z < -161.5,
  };
  console.log('Bus Collision:', JSON.stringify(report.gameplay.busCollision));

  // 7. Character Switching (Remy <-> Aarav via UI modal)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyC', key: 'c' });
  await sleep(200);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyC', key: 'c' });
  await sleep(300);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const aarav = btns.find((b) => b.textContent.includes('Aarav'));
    if (aarav) aarav.click();
  })()`);
  await sleep(200);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const apply = btns.find((b) => b.textContent.includes('Start Exploring') || b.textContent.includes('Apply') || b.textContent.includes('Continue'));
    if (apply) apply.click();
    if (window.__openCharacterModal) window.__openCharacterModal(false);
  })()`);
  await sleep(1500);
  await evaluate(`window.__gameEngine.resetPlayerPosition()`);
  await sleep(300);
  const aaravPre = await evaluate(`({
    name: window.__gameEngine.player.activeCharacterName,
    id: window.__gameEngine.player.activePreset?.id,
    pos: window.__gameEngine.player.getPosition(),
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await sleep(200);
  const aaravPost = await evaluate(`window.__gameEngine.player.getPosition()`);
  await screenshot('verify_aarav.png');

  // Switch back to Remy
  await evaluate(`window.__selectCharacter('remy')`);
  await sleep(1200);
  const remyBack = await evaluate(`({
    name: window.__gameEngine.player.activeCharacterName,
    id: window.__gameEngine.player.activePreset?.id,
  })`);
  report.gameplay.characterSwitching = {
    aaravName: aaravPre.name,
    aaravMovedZ: Number((aaravPost.z - aaravPre.pos.z).toFixed(3)),
    remyRestoredName: remyBack.name,
    passed: aaravPre.name === 'Aarav' && aaravPost.z > aaravPre.pos.z + 0.5 && remyBack.name === 'Remy',
  };
  console.log('Character Switching:', JSON.stringify(report.gameplay.characterSwitching));

  // 8. Vehicle Behaviour (CVR Bus 01 & Campus Car)
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.teleportPlayer(50.25, 1.0, -170.5, 0);
  })()`);
  await sleep(400);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyF', key: 'f' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyF', key: 'f' });
  await sleep(300);
  const busEntered = await evaluate(`({
    isDriving: window.__gameEngine.vehicles.isDriving,
    vehicleId: window.__gameEngine.vehicles.activeVehicle?.id,
    pos: window.__gameEngine.vehicles.activeVehicle?.rigidBody.translation(),
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  await sleep(1200);
  const busDriven = await evaluate(`({
    speed: window.__gameEngine.vehicles.activeVehicle?.speed,
    pos: window.__gameEngine.vehicles.activeVehicle?.rigidBody.translation(),
  })`);
  await screenshot('verify_driving_bus.png');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyF', key: 'f' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyF', key: 'f' });
  await sleep(300);
  const busExited = await evaluate(`({
    isDriving: window.__gameEngine.vehicles.isDriving,
    playerVisible: window.__gameEngine.player.mesh.visible,
  })`);

  // Also test Campus Car (merged car.glb)
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.teleportPlayer(26.8, 1.0, -120.0, -Math.PI / 2);
  })()`);
  await sleep(400);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyF', key: 'f' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyF', key: 'f' });
  await sleep(300);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(1000);
  const carDriven = await evaluate(`({
    isDriving: window.__gameEngine.vehicles.isDriving,
    vehicleId: window.__gameEngine.vehicles.activeVehicle?.id,
    speed: window.__gameEngine.vehicles.activeVehicle?.speed,
    pos: window.__gameEngine.vehicles.activeVehicle?.rigidBody.translation(),
  })`);
  await screenshot('verify_driving_car.png');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyF', key: 'f' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyF', key: 'f' });
  await sleep(300);

  report.gameplay.vehicles = {
    busEntered,
    busMovedDist: Number(Math.hypot((busDriven.pos?.x || 0) - (busEntered.pos?.x || 0), (busDriven.pos?.z || 0) - (busEntered.pos?.z || 0)).toFixed(2)),
    busExited,
    carDriven,
    passed: busEntered.isDriving && busEntered.vehicleId === 'cvr-bus' && !busExited.isDriving && busExited.playerVisible && carDriven.isDriving && carDriven.vehicleId === 'campus-car' && Math.abs(carDriven.speed) > 1.0,
  };
  console.log('Vehicles:', JSON.stringify(report.gameplay.vehicles));

  // =========================================================================
  // PART 2: CONTINUOUS GAMEPLAY RECORDING (15s WebM via MediaRecorder)
  // =========================================================================
  console.log('\n=== PART 2: RECORDING CONTINUOUS GAMEPLAY VIDEO (15s) ===');
  await evaluate(`(() => {
    const ge = window.__gameEngine;
    ge.resetPlayerPosition();
  })()`);
  await sleep(400);

  await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
    window.__recordedChunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) window.__recordedChunks.push(e.data); };
    recorder.start(250);
    window.__recorder = recorder;
  })()`);

  // Automated 15s live gameplay choreography
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await sleep(2500);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' });
  await sleep(2500);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ' });
  await sleep(200);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' });
  await sleep(1500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });

  // Pan camera smoothly to inspect trees, sky, and bus bay
  for (let i = 0; i < 40; i++) {
    await evaluate(`window.__gameEngine.cameraController.theta -= 0.04;`);
    await sleep(50);
  }
  for (let i = 0; i < 25; i++) {
    await evaluate(`window.__gameEngine.cameraController.pitch = Math.min(1.15, window.__gameEngine.cameraController.pitch + 0.04);`);
    await sleep(50);
  }
  await sleep(1500);
  for (let i = 0; i < 25; i++) {
    await evaluate(`window.__gameEngine.cameraController.pitch = Math.max(0.12, window.__gameEngine.cameraController.pitch - 0.04);`);
    await sleep(50);
  }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyR', key: 'r' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyR', key: 'r' });
  await sleep(1500);

  const videoBase64 = await evaluate(`(async () => {
    const rec = window.__recorder;
    await new Promise((res) => { rec.onstop = res; rec.stop(); });
    const blob = new Blob(window.__recordedChunks, { type: 'video/webm' });
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  })()`);
  const videoPath = path.join(OUT_DIR, 'upgrade9_gameplay_recording.webm');
  fs.writeFileSync(videoPath, Buffer.from(videoBase64, 'base64'));
  console.log('Saved continuous gameplay video:', videoPath, fs.statSync(videoPath).size, 'bytes');

  // =========================================================================
  // PART 3: REAL 60-SECOND WALL-CLOCK REQUESTANIMATIONFRAME BENCHMARK
  // =========================================================================
  console.log('\n=== PART 3: 60-SECOND REAL WALL-CLOCK rAF BENCHMARK (1280x720, DPR=1) ===');
  await evaluate(`window.__gameEngine.resetPlayerPosition()`);
  await sleep(300);

  const perf60s = await evaluate(`(async () => {
    const ge = window.__gameEngine;
    const deltas = [];
    const drawCalls = [];
    const triangles = [];
    let prevTs = null;
    const startWall = performance.now();
    let active = true;

    return await new Promise((resolve) => {
      function observer(ts) {
        if (!active) return;
        const elapsed = ts - startWall;
        if (prevTs !== null) {
          deltas.push(ts - prevTs);
          drawCalls.push(ge.renderer.info.render.calls);
          triangles.push(ge.renderer.info.render.triangles);
        }
        prevTs = ts;

        // Continuous realistic gameplay input across 60 wall-clock seconds:
        if (elapsed < 10000) {
          ge.player.keys['KeyW'] = true;
          ge.player.keys['ShiftLeft'] = false;
        } else if (elapsed < 20000) {
          ge.player.keys['KeyW'] = true;
          ge.player.keys['ShiftLeft'] = true;
        } else if (elapsed < 26000) {
          ge.player.keys['KeyW'] = false;
          ge.player.keys['ShiftLeft'] = false;
          ge.player.keys['KeyD'] = true;
        } else if (elapsed < 32000) {
          ge.player.keys['KeyD'] = false;
          ge.player.keys['KeyA'] = true;
        } else if (elapsed < 42000) {
          ge.player.keys['KeyA'] = false;
          ge.cameraController.theta += 0.012;
        } else if (elapsed < 52000) {
          ge.cameraController.pitch = 1.05; // Look up at sky
        } else {
          ge.cameraController.pitch = 0.12;
          ge.player.keys['KeyW'] = true;
        }

        if (elapsed >= 60000) {
          active = false;
          ge.player.keys = {};
          const n = deltas.length;
          const sorted = [...deltas].sort((a, b) => a - b);
          const avgDelta = deltas.reduce((a, b) => a + b, 0) / n;
          const p99Delta = sorted[Math.floor(n * 0.99)];
          const p999Delta = sorted[Math.floor(n * 0.999)];
          const maxDelta = sorted[n - 1];
          const minDelta = sorted[0];
          const avgCalls = Math.round(drawCalls.reduce((a, b) => a + b, 0) / n);
          const maxCalls = Math.max(...drawCalls);
          const minCalls = Math.min(...drawCalls);
          const avgTris = Math.round(triangles.reduce((a, b) => a + b, 0) / n);
          const maxTris = Math.max(...triangles);
          const minTris = Math.min(...triangles);
          const size = ge.renderer.getDrawingBufferSize(new window.THREE.Vector2());
          resolve({
            wallClockDurationSec: Number((elapsed / 1000).toFixed(2)),
            totalRafFrames: n,
            avgFps: Number((1000 / avgDelta).toFixed(1)),
            low1PercentFps: Number((1000 / p99Delta).toFixed(1)),
            low01PercentFps: Number((1000 / p999Delta).toFixed(1)),
            minFps: Number((1000 / maxDelta).toFixed(1)),
            avgFrameTimeMs: Number(avgDelta.toFixed(2)),
            minFrameTimeMs: Number(minDelta.toFixed(2)),
            p99FrameTimeMs: Number(p99Delta.toFixed(2)),
            p999FrameTimeMs: Number(p999Delta.toFixed(2)),
            maxFrameTimeMs: Number(maxDelta.toFixed(2)),
            avgDrawCalls: avgCalls,
            minDrawCalls: minCalls,
            maxDrawCalls: maxCalls,
            avgTriangles: avgTris,
            minTriangles: minTris,
            maxTriangles: maxTris,
            drawingBufferResolution: size.x + 'x' + size.y,
            devicePixelRatio: ge.renderer.getPixelRatio(),
            windowDevicePixelRatio: window.devicePixelRatio,
            memory: {
              geometries: ge.renderer.info.memory.geometries,
              textures: ge.renderer.info.memory.textures,
            },
          });
          return;
        }
        requestAnimationFrame(observer);
      }
      requestAnimationFrame(observer);
    });
  })()`);
  report.performance.wallClock60s_1280x720_DPR1 = perf60s;
  console.log('60s Wall-Clock rAF Results (1280x720, DPR=1):', JSON.stringify(perf60s, null, 2));

  // Also measure resolution impact separately (10s sample at DPR=2 vs DPR=1.5)
  console.log('\n=== PART 4: SEPARATE RESOLUTION COMPARISON (DPR=2.0 vs DPR=1.5 at 1280x720) ===');
  const measureDpr = async (dprVal) => {
    await evaluate(`(() => {
      const ge = window.__gameEngine;
      ge.renderer.setPixelRatio(${dprVal});
      ge.resetPlayerPosition();
    })()`);
    await sleep(300);
    return await evaluate(`(async () => {
      const ge = window.__gameEngine;
      const deltas = [];
      let prev = null;
      const start = performance.now();
      return await new Promise((resolve) => {
        function obs(ts) {
          const el = ts - start;
          if (prev !== null) deltas.push(ts - prev);
          prev = ts;
          if (el >= 10000) {
            const n = deltas.length;
            const avg = deltas.reduce((a, b) => a + b, 0) / n;
            const sorted = [...deltas].sort((a, b) => a - b);
            const p99 = sorted[Math.floor(n * 0.99)];
            const size = ge.renderer.getDrawingBufferSize(new window.THREE.Vector2());
            resolve({
              dpr: ge.renderer.getPixelRatio(),
              resolution: size.x + 'x' + size.y,
              frames: n,
              avgFps: Number((1000 / avg).toFixed(1)),
              low1PercentFps: Number((1000 / p99).toFixed(1)),
              avgFrameTimeMs: Number(avg.toFixed(2)),
              p99FrameTimeMs: Number(p99.toFixed(2)),
            });
            return;
          }
          requestAnimationFrame(obs);
        }
        requestAnimationFrame(obs);
      });
    })()`);
  };
  report.performance.resolutionComparison = {
    dpr2: await measureDpr(2.0),
    dpr15: await measureDpr(1.5),
  };
  console.log('Resolution Comparison:', JSON.stringify(report.performance.resolutionComparison, null, 2));

  report.errors = errors;
  const outJson = path.join(OUT_DIR, 'full_verification_report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log('\nSaved full report:', outJson);
  console.log('Console/Runtime errors during full verification:', errors.length);

  ws.close();
  if (errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
