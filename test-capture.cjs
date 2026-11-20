const http = require('http');
const fs = require('fs');

async function main() {
  http.get('http://127.0.0.1:9223/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost'));
      if (!page) {
        console.error('No localhost page found');
        process.exit(1);
      }

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      const consoleErrors = [];
      const consoleWarnings = [];

      ws.onopen = async () => {
        ws.send(JSON.stringify({ id: 1, method: 'Input.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 4, method: 'Console.enable' }));
      };

      ws.onmessage = (msg) => {
        const parsed = JSON.parse(msg.data);
        if (parsed.method === 'Console.messageAdded') {
          const m = parsed.params.message;
          if (m.level === 'error') consoleErrors.push(m.text);
          if (m.level === 'warning') consoleWarnings.push(m.text);
        }
        if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
          consoleErrors.push(parsed.params.args.map(a => a.value || a.description).join(' '));
        }
        if (parsed.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(parsed.params.exceptionDetails.text + ' ' + (parsed.params.exceptionDetails.exception?.description || ''));
        }
      };

      // Wait for page load and initial render
      await new Promise(r => setTimeout(r, 2200));

      const evalPromise = (expr) => new Promise(resolve => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const parsed = JSON.parse(msg.data);
          if (parsed.id === id) {
            ws.removeEventListener('message', handler);
            resolve(parsed.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression: expr, returnByValue: true }
        }));
      });

      const captureScreenshot = (filepath) => new Promise(resolve => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const parsed = JSON.parse(msg.data);
          if (parsed.id === id) {
            ws.removeEventListener('message', handler);
            const buffer = Buffer.from(parsed.result.data, 'base64');
            fs.writeFileSync(filepath, buffer);
            console.log(`Saved screenshot: ${filepath} (${buffer.length} bytes)`);
            resolve();
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      });

      // View A: Main Entrance Gate & Sandstone Monument Wall
      console.log('Framing View A: Main Entrance Gate & Sandstone Monument...');
      await evalPromise(`
        window.__toggleHUD(true);
        window.__setCameraView(Math.PI / 2, 1.28, 15.0, { x: 144, y: 1.5, z: 42, facingAngle: -Math.PI / 2 });
      `);
      await new Promise(r => setTimeout(r, 800));
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-view-a-gate.png');

      // View B: Overarching Tree-Canopied Avenue toward Main Block
      console.log('Framing View B: Overarching Tree Avenue...');
      await evalPromise(`
        window.__setCameraView(Math.PI / 2, 1.25, 8.5, { x: 110, y: 1.5, z: 45, facingAngle: -Math.PI / 2 });
      `);
      await new Promise(r => setTimeout(r, 800));
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-view-b-avenue.png');

      // View C: Main Block Front Facade with Portico, Pillars, Signs
      // 1. Clean View (100% full-screen without HUD)
      console.log('Framing View C (Clean): Main Block Front Facade...');
      await evalPromise(`
        window.__toggleHUD(false);
        window.__setCameraView(Math.PI / 2, 1.34, 23.0, { x: 4.0, y: 1.5, z: 25.0, facingAngle: -Math.PI / 2 });
      `);
      await new Promise(r => setTimeout(r, 800));
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-view-c-mainblock-clean.png');

      // 2. View C with HUD visible (framed to show portico, sign, and telemetry)
      console.log('Framing View C (HUD): Main Block Front Facade...');
      await evalPromise(`
        window.__toggleHUD(true);
        window.__setCameraView(Math.PI / 2, 1.34, 23.0, { x: 4.0, y: 1.5, z: 18.0, facingAngle: -Math.PI / 2 });
      `);
      await new Promise(r => setTimeout(r, 800));
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-view-c-mainblock.png');

      // View D: Front Garden Lawn & High-Tension Transmission Tower
      console.log('Framing View D: Front Garden Lawn & 36m Tower...');
      await evalPromise(`
        window.__setCameraView(0, 1.36, 12.0, { x: 38, y: 1.5, z: 25, facingAngle: 0 });
      `);
      await new Promise(r => setTimeout(r, 800));
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-view-d-garden.png');

      // Step 5: Verify walking under the overhanging portico into the lobby
      console.log('Testing walking under overhanging portico into lobby...');
      await evalPromise(`
        window.__setCameraView(Math.PI / 2, 1.25, 8.0, { x: 0, y: 1.5, z: 25, facingAngle: -Math.PI / 2 });
      `);
      await new Promise(r => setTimeout(r, 400));

      // Trigger KeyW down via DOM event
      await evalPromise(`
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
      `);
      console.log('Walking forward into lobby for 3.5 seconds...');
      await new Promise(r => setTimeout(r, 3500));
      // Release KeyW
      await evalPromise(`
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
      `);

      const posResult = await evalPromise(`
        (() => {
          const el = Array.from(document.querySelectorAll('span, div')).find(e => e.className && e.className.includes('font-mono') && e.textContent.includes(','));
          return el ? el.textContent : 'not found';
        })()
      `);
      console.log('Player position after walking under portico:', JSON.stringify(posResult));

      // Capture screenshot inside lobby
      await captureScreenshot('/Users/narojushyamprasad/Desktop/3D-campus/cvr-lobby-walked.png');

      console.log('--- CONSOLE ERROR REPORT ---');
      console.log('Console Errors (' + consoleErrors.length + '):', consoleErrors);
      console.log('Console Warnings (' + consoleWarnings.length + '):', consoleWarnings);

      ws.close();
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
