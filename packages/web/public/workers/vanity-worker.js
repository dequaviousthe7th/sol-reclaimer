// Vanity wallet generator Web Worker — loads Rust WASM and runs batch generation loop
importScripts('/wasm/vanity_wasm.js');

let shouldStop = false;
const BATCH_SIZE = 5000;

let wasmReady = false;

async function initWasm() {
  await wasm_bindgen('/wasm/vanity_wasm_bg.wasm');
  wasmReady = true;
}

self.onmessage = async function(e) {
  const { type, config } = e.data;

  if (type === 'stop') {
    shouldStop = true;
    return;
  }

  if (type === 'start') {
    shouldStop = false;

    if (!wasmReady) {
      try {
        await initWasm();
      } catch (err) {
        self.postMessage({ type: 'error', message: 'Failed to load WASM: ' + err.message });
        return;
      }
    }

    const { prefix, suffix, caseSensitive } = config;

    while (!shouldStop) {
      const result = wasm_bindgen.wasm_generate_batch(
        prefix || '',
        suffix || '',
        caseSensitive,
        BATCH_SIZE,
      );

      if (result.found) {
        const secretKey = new Uint8Array(result.secretKey);
        self.postMessage({
          type: 'found',
          address: result.address,
          secretKey: secretKey,
          attempts: BATCH_SIZE,
        });
        return;
      }

      self.postMessage({
        type: 'progress',
        attempts: BATCH_SIZE,
      });

      // Yield to event loop to check for stop messages
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
};
