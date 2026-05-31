// Generate Pac-Man contribution-graph SVGs (light + dark) using the
// `pacman-contribution-graph` npm package.
//
// Why the npm lib and not the published GitHub Action: the Action renders via
// node-canvas in a Docker container and reliably OOMs the runner. The npm lib emits
// plain SVG strings via `svgCallback` — no raster canvas — so it stays light. It does
// expect browser globals (`document`, requestAnimationFrame), which we shim with jsdom.
import fs from "fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><body></body>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { ArcadeRenderer } = await import("pacman-contribution-graph");

const OWNER = process.env.OWNER;
const TOKEN = process.env.GH_TOKEN;
if (!OWNER) {
  console.error("OWNER env var is required");
  process.exit(1);
}

function generate(theme, file) {
  return new Promise((resolve, reject) => {
    let last = "";
    const finish = () => {
      if (!last) return reject(new Error(`empty SVG for ${file}`));
      fs.writeFileSync(file, last);
      console.log(`wrote ${file} (${last.length} bytes)`);
      resolve();
    };
    const renderer = new ArcadeRenderer({
      game: "pacman",
      username: OWNER,
      platform: "github",
      gameTheme: theme,
      playerStyle: "opportunistic",
      githubSettings: TOKEN ? { accessToken: TOKEN } : undefined,
      svgCallback: (svg) => {
        last = svg;
      },
      gameOverCallback: finish,
    });
    renderer.start();
    // Safety net: if gameOverCallback never fires, write whatever we last captured.
    setTimeout(() => (last ? finish() : reject(new Error(`timeout, empty SVG for ${file}`))), 90000);
  });
}

await generate("github", "dist/pacman.svg");
await generate("github-dark", "dist/pacman-dark.svg");
process.exit(0);
