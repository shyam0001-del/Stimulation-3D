const fs = require('fs');

async function main() {
  console.log('Connecting to Chrome CDP on port 9222...');
  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const page = tabs.find(t => t.url.includes('5173') && t.type === 'page');
  if (!page) throw new Error('Could not find active game page on port 5173');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(res => ws.onopen = res);

  let id = 1;
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
      awaitPromise: true
    });
    if (res.exceptionDetails) throw new Error('Eval error: ' + JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Helper to step engine frames deterministically in headless environment
  async function stepFrames(n = 15, dtMs = 16.66) {
    await evaluate(`(() => {
      const ge = window.__gameEngine;
      let now = performance.now();
      for (let i = 0; i < ${n}; i++) {
        now += ${dtMs};
        ge.tick(now);
      }
    })()`);
  }

  console.log('=== Step 1: Clean Page Reload & Focus ===');
  await send('Page.reload');
  await sleep(4000);
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  console.log('=== Step 2: Dismiss character modal & enter campus ===');
  await evaluate(`(() => {
    if (window.__openCharacterModal) window.__openCharacterModal(false);
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Enter Campus') || b.textContent.includes('Explore') || b.textContent.includes('Start'));
    if (btn) btn.click();
  })()`);
  await sleep(1500);

  // Press R to ensure clean reset to spawn
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyR', key: 'r' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyR', key: 'r' });
  await stepFrames(30);

  console.log('=== Step 3: Place Visible Reference Marker directly ahead of player ===');
  await evaluate(`(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const scene = window.__gameEngine.scene;
    
    // Remove existing test marker if any
    const old = scene.getObjectByName('TestReferenceMarker');
    if (old) scene.remove(old);

    // Bright magenta reference pillar 19m ahead of Remy (at x=25, y=2.0, z=-165)
    const geom = new THREE.CylinderGeometry(0.3, 0.3, 3.0, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const marker = new THREE.Mesh(geom, mat);
    marker.name = 'TestReferenceMarker';
    marker.position.set(25.0, 1.5, -165.0);
    scene.add(marker);
    window.__refMarker = marker;

    // Lock pointer for testing pointer-lock mousemove
    window.__gameEngine.cameraController.isPointerLocked = true;
  })()`);

  // Helper to get screen projection coordinates of reference marker and player
  async function getScreenCoords() {
    return await evaluate(`(() => {
      const cam = window.__gameEngine.cameraController.camera;
      cam.updateMatrixWorld();
      const marker = window.__refMarker;
      const markerScreen = marker.position.clone().project(cam);
      
      const playerPos = window.__gameEngine.player.getPosition();
      const THREE = window.__gameEngine.player.mesh.position.constructor;
      const playerVec = new THREE(playerPos.x, playerPos.y, playerPos.z);
      const playerScreen = playerVec.project(cam);

      return {
        markerScreenX: Number(markerScreen.x.toFixed(4)),
        markerScreenY: Number(markerScreen.y.toFixed(4)),
        playerScreenX: Number(playerScreen.x.toFixed(4)),
        playerScreenY: Number(playerScreen.y.toFixed(4)),
        playerPos: {
          x: Number(playerPos.x.toFixed(3)),
          y: Number(playerPos.y.toFixed(3)),
          z: Number(playerPos.z.toFixed(3))
        },
        camPos: {
          x: Number(cam.position.x.toFixed(3)),
          y: Number(cam.position.y.toFixed(3)),
          z: Number(cam.position.z.toFixed(3))
        },
        theta: Number(window.__gameEngine.cameraController.theta.toFixed(3)),
        pitch: Number(window.__gameEngine.cameraController.pitch.toFixed(3))
      };
    })()`);
  }

  // Ensure camera is snapped clean at initial spawn view
  await evaluate(`(() => {
    const p = window.__gameEngine.player.getPosition();
    window.__gameEngine.cameraController.snapView(Math.PI, 0.12, 5.2, p);
  })()`);
  await stepFrames(5);

  console.log('\n--- Initial Camera & Screen State ---');
  const initial = await getScreenCoords();
  console.log('Initial:', initial);

  console.log('\n=== TEST 1: Mouse RIGHT (Expect: camera looks right, reference marker moves LEFT on screen) ===');
  await evaluate(`(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 80, movementY: 0 }));
  })()`);
  await stepFrames(20);
  const afterMouseRight = await getScreenCoords();
  console.log('After Mouse Right (+80):', afterMouseRight);
  const deltaMarkerRight = afterMouseRight.markerScreenX - initial.markerScreenX;
  console.log(`Marker Screen X Delta: ${deltaMarkerRight} (Negative = Moved Left on Screen)`);
  if (deltaMarkerRight < -0.05) {
    console.log('✅ TEST 1 PASSED: Mouse right turned camera RIGHT, marker moved LEFT on screen!');
  } else {
    throw new Error(`❌ TEST 1 FAILED: Marker did not move left on screen! Delta: ${deltaMarkerRight}`);
  }

  console.log('\n=== TEST 2: Mouse LEFT (Expect: camera looks left, reference marker moves RIGHT on screen) ===');
  await evaluate(`(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: -160, movementY: 0 }));
  })()`);
  await stepFrames(20);
  const afterMouseLeft = await getScreenCoords();
  console.log('After Mouse Left (-160):', afterMouseLeft);
  const deltaMarkerLeft = afterMouseLeft.markerScreenX - afterMouseRight.markerScreenX;
  console.log(`Marker Screen X Delta: ${deltaMarkerLeft} (Positive = Moved Right on Screen)`);
  if (deltaMarkerLeft > 0.1) {
    console.log('✅ TEST 2 PASSED: Mouse left turned camera LEFT, marker moved RIGHT on screen!');
  } else {
    throw new Error(`❌ TEST 2 FAILED: Marker did not move right on screen! Delta: ${deltaMarkerLeft}`);
  }

  // Reset camera view back to default level
  await evaluate(`(() => {
    const p = window.__gameEngine.player.getPosition();
    window.__gameEngine.cameraController.snapView(Math.PI, 0.12, 5.2, p);
  })()`);
  await stepFrames(5);
  const levelState = await getScreenCoords();

  console.log('\n=== TEST 3: Mouse UP (Expect: camera looks UP toward sky, horizon/marker moves DOWN) ===');
  await evaluate(`(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: -100 }));
  })()`);
  await stepFrames(20);
  const afterMouseUp = await getScreenCoords();
  console.log('After Mouse Up (-100):', afterMouseUp);
  const deltaMarkerUp = afterMouseUp.markerScreenY - levelState.markerScreenY;
  console.log(`Marker Screen Y Delta: ${deltaMarkerUp} (Negative = Moved Down on Screen)`);
  if (deltaMarkerUp < -0.05 && afterMouseUp.pitch > levelState.pitch) {
    console.log('✅ TEST 3 PASSED: Mouse up increased pitch and looked UP toward sky!');
  } else {
    throw new Error(`❌ TEST 3 FAILED: Camera did not look up! Delta: ${deltaMarkerUp}`);
  }

  console.log('\n=== TEST 4: Mouse DOWN (Expect: camera looks DOWN toward ground, horizon/marker moves UP) ===');
  await evaluate(`(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 200 }));
  })()`);
  await stepFrames(20);
  const afterMouseDown = await getScreenCoords();
  console.log('After Mouse Down (+200):', afterMouseDown);
  const deltaMarkerDown = afterMouseDown.markerScreenY - afterMouseUp.markerScreenY;
  console.log(`Marker Screen Y Delta: ${deltaMarkerDown} (Positive = Moved Up on Screen)`);
  if (deltaMarkerDown > 0.05 && afterMouseDown.pitch < afterMouseUp.pitch) {
    console.log('✅ TEST 4 PASSED: Mouse down decreased pitch and looked DOWN toward road!');
  } else {
    throw new Error(`❌ TEST 4 FAILED: Camera did not look down! Delta: ${deltaMarkerDown}`);
  }

  // Restore camera pitch to level
  await evaluate(`(() => {
    const p = window.__gameEngine.player.getPosition();
    window.__gameEngine.cameraController.snapView(Math.PI, 0.0, 5.2, p);
  })()`);
  await stepFrames(5);

  console.log('\n=== TEST 5: Pressing D (Expect: Character moves toward SCREEN-RIGHT / Camera Right) ===');
  const preD = await getScreenCoords();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  await stepFrames(25);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  await stepFrames(10);
  const postD = await getScreenCoords();
  
  // When looking South (theta=PI), camera right is West (-X).
  // Therefore, world X decreases, moving character toward camera right / screen right.
  const deltaDX = postD.playerPos.x - preD.playerPos.x;
  console.log(`Pre-D Pos X: ${preD.playerPos.x} -> Post-D Pos X: ${postD.playerPos.x} (Delta X: ${deltaDX.toFixed(3)})`);
  
  // Check movement along camera right: cameraRight = (cos(theta), -sin(theta)) = (-1, 0)
  const theta = postD.theta;
  const camRightX = Math.cos(theta);
  const camRightZ = -Math.sin(theta);
  const dotRight = deltaDX * camRightX + (postD.playerPos.z - preD.playerPos.z) * camRightZ;
  console.log(`Movement dot cameraRight: ${dotRight.toFixed(3)} (Must be > 0.5)`);

  if (dotRight > 0.5) {
    console.log('✅ TEST 5 PASSED: Pressing D moved character along Camera RIGHT (Screen-Right)!');
  } else {
    throw new Error(`❌ TEST 5 FAILED: Pressing D did not move along Camera Right! Dot: ${dotRight}`);
  }

  console.log('\n=== TEST 6: Pressing A (Expect: Character moves toward SCREEN-LEFT / Camera Left) ===');
  const preA = await getScreenCoords();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyA', key: 'a' });
  await stepFrames(25);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a' });
  await stepFrames(10);
  const postA = await getScreenCoords();
  
  const deltaAX = postA.playerPos.x - preA.playerPos.x;
  const dotLeft = deltaAX * (-camRightX) + (postA.playerPos.z - preA.playerPos.z) * (-camRightZ);
  console.log(`Pre-A Pos X: ${preA.playerPos.x} -> Post-A Pos X: ${postA.playerPos.x} (Delta X: ${deltaAX.toFixed(3)})`);
  console.log(`Movement dot cameraLeft: ${dotLeft.toFixed(3)} (Must be > 0.5)`);

  if (dotLeft > 0.5) {
    console.log('✅ TEST 6 PASSED: Pressing A moved character along Camera LEFT (Screen-Left)!');
  } else {
    throw new Error(`❌ TEST 6 FAILED: Pressing A did not move along Camera Left! Dot: ${dotLeft}`);
  }

  console.log('\n=== TEST 7: Pressing W (Expect: Character moves FORWARD away from camera into campus) ===');
  const preW = await getScreenCoords();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await stepFrames(25);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  await stepFrames(10);
  const postW = await getScreenCoords();
  
  // Camera forward = (-sin(theta), -cos(theta)) = (0, 1) when theta=PI
  const camFwdX = -Math.sin(theta);
  const camFwdZ = -Math.cos(theta);
  const dotFwd = (postW.playerPos.x - preW.playerPos.x) * camFwdX + (postW.playerPos.z - preW.playerPos.z) * camFwdZ;
  console.log(`Pre-W Pos:`, preW.playerPos, `-> Post-W Pos:`, postW.playerPos);
  console.log(`Movement dot cameraForward: ${dotFwd.toFixed(3)} (Must be > 0.5)`);

  if (dotFwd > 0.5) {
    console.log('✅ TEST 7 PASSED: Pressing W moved character forward along camera view into campus!');
  } else {
    throw new Error(`❌ TEST 7 FAILED: Pressing W did not move forward! Dot: ${dotFwd}`);
  }

  console.log('\n=== TEST 8: Pressing S (Expect: Character moves BACKWARD toward camera) ===');
  const preS = await getScreenCoords();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' });
  await stepFrames(25);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' });
  await stepFrames(10);
  const postS = await getScreenCoords();
  
  const dotBack = (postS.playerPos.x - preS.playerPos.x) * (-camFwdX) + (postS.playerPos.z - preS.playerPos.z) * (-camFwdZ);
  console.log(`Pre-S Pos:`, preS.playerPos, `-> Post-S Pos:`, postS.playerPos);
  console.log(`Movement dot cameraBackward: ${dotBack.toFixed(3)} (Must be > 0.5)`);

  if (dotBack > 0.5) {
    console.log('✅ TEST 8 PASSED: Pressing S moved character backward toward camera!');
  } else {
    throw new Error(`❌ TEST 8 FAILED: Pressing S did not move backward! Dot: ${dotBack}`);
  }

  console.log('\n=== TEST 9: Directional Consistency across 4 Camera Yaw Angles (0°, 90°, 180°, 270°) ===');
  const testAngles = [
    { name: '0° (Looking North toward Gate)', theta: 0.0 },
    { name: '90° (Looking West)', theta: Math.PI / 2 },
    { name: '180° (Looking South into Campus)', theta: Math.PI },
    { name: '270° (Looking East)', theta: 3 * Math.PI / 2 }
  ];

  for (const angle of testAngles) {
    console.log(`\n--- Testing at Camera Yaw: ${angle.name} ---`);
    await evaluate(`(() => {
      const p = window.__gameEngine.player.getPosition();
      window.__gameEngine.cameraController.snapView(${angle.theta}, 0.0, 5.2, p);
    })()`);
    await stepFrames(5);

    const cRightX = Math.cos(angle.theta);
    const cRightZ = -Math.sin(angle.theta);

    // Test D: must ALWAYS move character along camera right
    const beforeD = await getScreenCoords();
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
    await stepFrames(20);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
    await stepFrames(10);
    const afterD = await getScreenCoords();
    const dDotRight = (afterD.playerPos.x - beforeD.playerPos.x) * cRightX + (afterD.playerPos.z - beforeD.playerPos.z) * cRightZ;
    console.log(`[${angle.name}] Key D -> dot(cameraRight): ${dDotRight.toFixed(3)}`);
    if (dDotRight <= 0.3) {
      throw new Error(`❌ Failed Key D at ${angle.name}! dot: ${dDotRight}`);
    }

    // Test A: must ALWAYS move character along camera left
    const beforeA = await getScreenCoords();
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyA', key: 'a' });
    await stepFrames(20);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a' });
    await stepFrames(10);
    const afterA = await getScreenCoords();
    const aDotLeft = (afterA.playerPos.x - beforeA.playerPos.x) * (-cRightX) + (afterA.playerPos.z - beforeA.playerPos.z) * (-cRightZ);
    console.log(`[${angle.name}] Key A -> dot(cameraLeft): ${aDotLeft.toFixed(3)}`);
    if (aDotLeft <= 0.3) {
      throw new Error(`❌ Failed Key A at ${angle.name}! dot: ${aDotLeft}`);
    }
    console.log(`✅ [${angle.name}] Strafe controls 100% verified (D = right, A = left)!`);
  }

  console.log('\n=== TEST 10: Reset Gate (Key R) Verification ===');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyR', key: 'r' });
  await sleep(100);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyR', key: 'r' });
  await stepFrames(30);
  const resetState = await evaluate(`(() => {
    const p = window.__gameEngine.player.getPosition();
    return {
      x: Number(p.x.toFixed(1)),
      y: Number(p.y.toFixed(1)),
      z: Number(p.z.toFixed(1)),
      theta: Number(window.__gameEngine.cameraController.theta.toFixed(2))
    };
  })()`);
  console.log('State after R reset:', resetState);
  if (resetState.z === -184 && Math.abs(resetState.theta - 3.14) < 0.1) {
    console.log('✅ TEST 10 PASSED: Reset Gate (R) cleanly resets player and camera!');
  } else {
    throw new Error('❌ TEST 10 FAILED: R reset did not return to spawn!');
  }

  console.log('\n=== TEST 11: Aarav Character Verification ===');
  await evaluate(`(async () => {
    await window.__gameEngine.selectCharacter('aarav-cse');
  })()`);
  await sleep(1200);
  await stepFrames(20);
  const preAaravD = await getScreenCoords();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  await stepFrames(20);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  await stepFrames(10);
  const postAaravD = await getScreenCoords();
  const cRx = Math.cos(postAaravD.theta);
  const cRz = -Math.sin(postAaravD.theta);
  const aaravDot = (postAaravD.playerPos.x - preAaravD.playerPos.x) * cRx + (postAaravD.playerPos.z - preAaravD.playerPos.z) * cRz;
  console.log('Aarav Key D dot cameraRight:', aaravDot.toFixed(3));
  if (aaravDot > 0.3) {
    console.log('✅ TEST 11 PASSED: Aarav controls identically to Remy (D moves camera-right)!');
  } else {
    throw new Error(`❌ TEST 11 FAILED: Aarav controls mismatch! dot: ${aaravDot}`);
  }

  // Swap back to Remy and clean up marker
  await evaluate(`(async () => {
    await window.__gameEngine.selectCharacter('remy');
    const marker = window.__gameEngine.scene.getObjectByName('TestReferenceMarker');
    if (marker) window.__gameEngine.scene.remove(marker);
    window.__gameEngine.resetPlayerPosition();
  })()`);
  await stepFrames(30);

  // Capture final screenshot confirming clean restored scene
  const snapFinal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/narojushyamprasad/.gemini/antigravity/brain/ac37d435-5ff5-4528-9825-0b913c7245fc/controls_repaired_verified_view.png', Buffer.from(snapFinal.data, 'base64'));
  console.log('Saved controls_repaired_verified_view.png');

  ws.close();
  console.log('\n🎉 ALL 11 TESTS PASSED WITH 100% SUCCESS! CONTROLS ARE COMPLETELY REPAIRED AND MATHEMATICALLY PROVEN!');
  process.exit(0);
}

main().catch(err => {
  console.error('\nTEST RUN FAILED:', err);
  process.exit(1);
});
