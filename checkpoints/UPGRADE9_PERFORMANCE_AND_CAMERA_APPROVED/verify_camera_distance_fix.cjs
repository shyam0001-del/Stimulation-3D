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

  async function screenshot(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const out = path.join(OUT_DIR, name);
    fs.writeFileSync(out, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', out);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.reload');
  await sleep(4500);
  errors.length = 0;
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  await evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('div.cursor-pointer'));
    const remy = cards.find((d) => d.textContent.includes('Remy'));
    if (remy) remy.click();
    const start = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Start Exploring'));
    if (start) start.click();
    if (window.__openCharacterModal) window.__openCharacterModal(false);
    if (window.__toggleHUD) window.__toggleHUD(true);
  })()`);
  await sleep(1500);

  async function measureMovement(label, startX, startY, startZ, theta, pitch, keys, frames = 50, shotName = null) {
    await evaluate(`(() => {
      const ge = window.__gameEngine;
      ge.teleportPlayer(${startX}, ${startY}, ${startZ}, 0);
      ge.cameraController.snapView(${theta}, ${pitch}, 3.4, { x: ${startX}, y: ${startY}, z: ${startZ} });
    })()`);
    await sleep(250);

    const stats = await evaluate(`(async () => {
      const ge = window.__gameEngine;
      const cam = ge.cameraController;
      const keysArr = ${JSON.stringify(keys)};
      for (const k of keysArr) ge.player.keys[k] = true;

      let minActual = Infinity;
      let maxActual = 0;
      let minCollisionDist = Infinity;
      let maxSpeed = 0;
      let playerHits = 0;

      for (let f = 0; f < ${frames}; f++) {
        await new Promise((r) => requestAnimationFrame(r));
        const pPos = ge.player.getPosition();
        const playerCenter = new window.THREE.Vector3(pPos.x, pPos.y + 0.42, pPos.z);
        const actualDistFromPlayer = cam.camera.position.distanceTo(playerCenter);
        const actualDistFromFocus = cam.camera.position.distanceTo(cam.currentFocus);
        if (actualDistFromPlayer < minActual) minActual = actualDistFromPlayer;
        if (actualDistFromPlayer > maxActual) maxActual = actualDistFromPlayer;
        if (ge.player.currentSpeed > maxSpeed) maxSpeed = ge.player.currentSpeed;

        // Verify raycast with excludeCollider does NOT hit player
        const hit = ge.physics.castRay(
          { x: playerCenter.x, y: playerCenter.y, z: playerCenter.z },
          { x: 0, y: 0, z: -1 },
          3.4,
          true,
          ge.player.collider
        );
        if (hit && hit.collider.handle === ge.player.collider.handle) playerHits++;
        if (cam.collisionDistance !== undefined && cam.collisionDistance < minCollisionDist) {
          minCollisionDist = cam.collisionDistance;
        }
      }

      const endDist = cam.camera.position.distanceTo(
        new window.THREE.Vector3(
          ge.player.getPosition().x,
          ge.player.getPosition().y + 0.42,
          ge.player.getPosition().z
        )
      );
      ge.player.keys = {};
      return {
        desiredDist: Number(cam.distance.toFixed(3)),
        minActualDistFromPlayer: Number(minActual.toFixed(3)),
        maxActualDistFromPlayer: Number(maxActual.toFixed(3)),
        endDistFromPlayer: Number(endDist.toFixed(3)),
        minCollisionDist: Number(minCollisionDist.toFixed(3)),
        maxSpeed: Number(maxSpeed.toFixed(2)),
        playerSelfHits: playerHits,
      };
    })()`);

    if (shotName) await screenshot(shotName);
    console.log(`[${label}]`, JSON.stringify(stats));
    return { label, ...stats };
  }

  const results = [];

  // 1. Open area: all 8 directions (walk & sprint) for Remy
  results.push(await measureMovement('Remy Open Walk Forward (W)', 25, 1.0, -176, Math.PI, 0.12, ['KeyW'], 45));
  results.push(await measureMovement('Remy Open Walk Backward (S)', 25, 1.0, -176, Math.PI, 0.12, ['KeyS'], 50));
  results.push(await measureMovement('Remy Open Sprint Forward (Shift+W)', 25, 1.0, -176, Math.PI, 0.12, ['ShiftLeft', 'KeyW'], 50));
  results.push(await measureMovement('Remy Open Sprint Backward (Shift+S)', 25, 1.0, -176, Math.PI, 0.12, ['ShiftLeft', 'KeyS'], 55, 'after_camera_fix_open_sprint_S.png'));
  results.push(await measureMovement('Remy Open Sprint Strafe Left (Shift+A)', 25, 1.0, -178, Math.PI, 0.12, ['ShiftLeft', 'KeyA'], 45));
  results.push(await measureMovement('Remy Open Sprint Strafe Right (Shift+D)', 25, 1.0, -178, Math.PI, 0.12, ['ShiftLeft', 'KeyD'], 45));
  results.push(await measureMovement('Remy Open Sprint Diag Back-Left (Shift+S+A)', 25, 1.0, -176, Math.PI, 0.12, ['ShiftLeft', 'KeyS', 'KeyA'], 45));
  results.push(await measureMovement('Remy Open Sprint Diag Back-Right (Shift+S+D)', 25, 1.0, -176, Math.PI, 0.12, ['ShiftLeft', 'KeyS', 'KeyD'], 45));
  results.push(await measureMovement('Remy Open Sprint Diag Fwd-Left (Shift+W+A)', 25, 1.0, -178, Math.PI, 0.12, ['ShiftLeft', 'KeyW', 'KeyA'], 45));
  results.push(await measureMovement('Remy Open Sprint Diag Fwd-Right (Shift+W+D)', 25, 1.0, -178, Math.PI, 0.12, ['ShiftLeft', 'KeyW', 'KeyD'], 45));

  // 2. Near Roadside Curb, Trees, Buses, Walls
  results.push(await measureMovement('Remy Near Roadside Curb Sprint Back (Shift+S)', 30.5, 1.0, -150, Math.PI, 0.12, ['ShiftLeft', 'KeyS'], 55, 'after_camera_fix_curb_sprint_S.png'));
  results.push(await measureMovement('Remy Near Avenue Trees Sprint Back (Shift+S)', 26.8, 1.0, -156, Math.PI, 0.12, ['ShiftLeft', 'KeyS'], 50));
  results.push(await measureMovement('Remy Near Parked Buses Aisle Sprint Back (Shift+S)', 56.5, 1.0, -154, Math.PI, 0.12, ['ShiftLeft', 'KeyS'], 50));
  results.push(await measureMovement('Remy Near Boundary Wall Sprint Sideways (Shift+D)', 36.0, 1.0, -174.5, Math.PI, 0.12, ['ShiftLeft', 'KeyD'], 50));

  // 3. Genuine Obstruction & Smooth Recovery (East Gate Pillar between player & camera, then step into open gate lane)
  console.log('\n=== GENUINE OBSTRUCTION & SMOOTH RECOVERY TEST ===');
  const obstruction = await evaluate(`(async () => {
    const ge = window.__gameEngine;
    const cam = ge.cameraController;
    // Place Remy at (32.35, 1.0, -170.0) just South of East Gate Pillar (x=32.35, z=-172.0, width=1.1m, depth=1.0m)
    // With theta=PI (camera to the North at z=-173.4), the pillar sits directly between player and camera!
    ge.teleportPlayer(32.35, 1.0, -170.0, 0);
    cam.snapView(Math.PI, 0.12, 3.4, { x: 32.35, y: 1.0, z: -170.0 });
    for (let f = 0; f < 30; f++) await new Promise((r) => requestAnimationFrame(r));
    const obstructedDist = cam.camera.position.distanceTo(cam.currentFocus);
    const obstructedColDist = cam.collisionDistance;

    // Now strafe West (KeyD moves -X when theta=PI) into open 6.25m East gate lane (x < 31.8)
    ge.player.keys['ShiftLeft'] = true;
    ge.player.keys['KeyD'] = true;
    const recoveryCurve = [];
    for (let f = 0; f < 65; f++) {
      await new Promise((r) => requestAnimationFrame(r));
      if (f % 8 === 0) {
        recoveryCurve.push({
          frame: f,
          playerX: Number(ge.player.getPosition().x.toFixed(2)),
          camDist: Number(cam.camera.position.distanceTo(cam.currentFocus).toFixed(3)),
          colDist: Number(cam.collisionDistance.toFixed(3)),
        });
      }
    }
    ge.player.keys = {};
    const recoveredDist = cam.camera.position.distanceTo(cam.currentFocus);
    return {
      obstructedDist: Number(obstructedDist.toFixed(3)),
      obstructedColDist: Number(obstructedColDist.toFixed(3)),
      recoveredDist: Number(recoveredDist.toFixed(3)),
      recoveryCurve,
    };
  })()`);
  await screenshot('after_camera_fix_obstruction_recovery.png');
  console.log('Obstruction & Recovery:', JSON.stringify(obstruction, null, 2));

  // 4. Switch to Aarav and test Sprint Backward (Shift+S) & Forward (Shift+W)
  await evaluate(`window.__selectCharacter('aarav-cse')`);
  await sleep(1400);
  results.push(await measureMovement('Aarav Open Sprint Backward (Shift+S)', 25, 1.0, -176, Math.PI, 0.12, ['ShiftLeft', 'KeyS'], 55, 'after_camera_fix_aarav_sprint_S.png'));
  results.push(await measureMovement('Aarav Open Sprint Forward (Shift+W)', 25, 1.0, -178, Math.PI, 0.12, ['ShiftLeft', 'KeyW'], 45));

  // Switch back to Remy for continuous recording
  await evaluate(`window.__selectCharacter('remy')`);
  await sleep(1200);

  // 5. Continuous Gameplay Recording demonstrating corrected backward running + all directions + 360 orbit
  console.log('\n=== RECORDING CONTINUOUS GAMEPLAY VIDEO (16s) ===');
  await evaluate(`window.__gameEngine.resetPlayerPosition()`);
  await sleep(300);
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

  // Walk & sprint forward into campus
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' });
  await sleep(2200);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });

  // Sprint backward (Shift+S) cleanly at full 3.4m distance!
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' });
  await sleep(2500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' });
  // Walk backward (S)
  await sleep(1500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' });

  // Strafe left & right & diagonal while orbiting 360 deg
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyA', key: 'a' });
  await sleep(1200);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  await sleep(1200);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' });
  for (let i = 0; i < 40; i++) {
    await evaluate(`window.__gameEngine.cameraController.theta += 0.157`);
    await sleep(50);
  }
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' });
  await sleep(500);

  // Move near roadside curb and sprint backward along curb
  await evaluate(`window.__gameEngine.teleportPlayer(30.5, 1.0, -150.0, 0)`);
  await evaluate(`window.__gameEngine.cameraController.snapView(Math.PI, 0.12, 3.4, { x: 30.5, y: 1.0, z: -150.0 })`);
  await sleep(200);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' });
  await sleep(2200);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' });
  await sleep(400);

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
  const videoPath = path.join(OUT_DIR, 'camera_backward_fix_recording.webm');
  fs.writeFileSync(videoPath, Buffer.from(videoBase64, 'base64'));
  console.log('Saved recording:', videoPath, fs.statSync(videoPath).size, 'bytes');

  fs.writeFileSync(path.join(OUT_DIR, 'camera_distance_fix_results.json'), JSON.stringify({ results, obstruction, errors }, null, 2));
  console.log('Errors:', errors.length, errors);

  // Assert camera stayed within comfortable third-person distance (>= 3.0m) in all unobstructed runs
  for (const r of results) {
    if (r.minActualDistFromPlayer < 3.0) {
      throw new Error(`Camera zoomed too close in [${r.label}]: minActualDistFromPlayer=${r.minActualDistFromPlayer}`);
    }
  }
  if (obstruction.obstructedDist >= 2.6) {
    throw new Error(`Spring-arm did not pull in for genuine monument obstruction: obstructedDist=${obstruction.obstructedDist}`);
  }
  if (obstruction.recoveredDist < 3.1) {
    throw new Error(`Camera did not smoothly recover after obstruction cleared: recoveredDist=${obstruction.recoveredDist}`);
  }
  if (errors.length > 0) process.exit(1);

  ws.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
