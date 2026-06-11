// Renders the YELO brand artwork (launcher icon + splash screens) from
// vector definitions into the PNG sources that `@capacitor/assets` consumes.
// The "Y" mark and the YELO wordmark are drawn as geometric strokes so the
// output never depends on installed system fonts.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve(import.meta.dirname, "..", "assets");

const green = "#126b50";
const greenDark = "#0b4f3a";
const canvasLight = "#f4f7f6";
const canvasDark = "#10201a";

// The "Y" drawn with round-capped strokes inside a 1024 viewBox.
function yGlyph(stroke, width = 96) {
  return `
    <g stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" fill="none">
      <line x1="352" y1="316" x2="512" y2="540" />
      <line x1="672" y1="316" x2="512" y2="540" />
      <line x1="512" y1="540" x2="512" y2="724" />
    </g>`;
}

// Geometric YELO wordmark drawn with strokes (used on the splash screen).
// Each letter lives in a 150x220 cell; cells are spaced 190 apart.
function wordmark(stroke, x, y, scale = 1) {
  const w = 34; // stroke width
  const letters = `
    <g stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none">
      <!-- Y -->
      <line x1="20"  y1="20"  x2="75"  y2="105" />
      <line x1="130" y1="20"  x2="75"  y2="105" />
      <line x1="75"  y1="105" x2="75"  y2="200" />
      <!-- E -->
      <line x1="210" y1="20"  x2="210" y2="200" />
      <line x1="210" y1="20"  x2="320" y2="20"  />
      <line x1="210" y1="110" x2="305" y2="110" />
      <line x1="210" y1="200" x2="320" y2="200" />
      <!-- L -->
      <line x1="400" y1="20"  x2="400" y2="200" />
      <line x1="400" y1="200" x2="505" y2="200" />
      <!-- O -->
      <circle cx="650" cy="110" r="90" />
    </g>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${letters}</g>`;
}

function roundedMark(size, fill, glyphStroke, radiusRatio = 0.30) {
  const r = Math.round(size * radiusRatio);
  return `
    <rect width="1024" height="1024" rx="${r * (1024 / size)}" fill="${fill}" />
    ${yGlyph(glyphStroke)}`;
}

// 1. Full icon (legacy launchers): green rounded square + white Y.
const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${green}" />
      <stop offset="1" stop-color="${greenDark}" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="232" fill="url(#bg)" />
  ${yGlyph("#ffffff")}
</svg>`;

// 2. Adaptive icon foreground: Y only, scaled into the safe zone
//    (Android masks the outer ~25%, so keep the glyph inside the middle 66%).
const iconForeground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">
    ${yGlyph("#ffffff", 110)}
  </g>
</svg>`;

// 3. Adaptive icon background: brand green gradient.
const iconBackground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${green}" />
      <stop offset="1" stop-color="${greenDark}" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
</svg>`;

// 4. Splash screens (2732x2732, artwork centered in the middle third so it
//    survives every crop). Light + dark variants.
function splash(background, markFill, glyph, text) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${background}" />
  <g transform="translate(1366 1180) scale(0.42) translate(-512 -512)">
    ${roundedMark(1024, markFill, glyph)}
  </g>
  ${wordmark(text, 1366 - 370 * 0.5 * 2, 1520, 1.0)}
</svg>`;
}

// Wordmark cell span is 740 wide at scale 1 → center it.
function splashCentered(background, markFill, glyph, text, muted) {
  const wordWidth = 740;
  const scale = 0.62;
  const x = 1366 - (wordWidth * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${background}" />
  <g transform="translate(1366 1210) scale(0.40) translate(-512 -512)">
    ${roundedMark(1024, markFill, glyph)}
  </g>
  ${wordmark(text, x, 1510, scale)}
  <text x="1366" y="2520" text-anchor="middle" fill="${muted}"
    font-family="Segoe UI, Arial, sans-serif" font-size="52" font-weight="600"
    letter-spacing="10">POWERED BY SHIFTDEPLOY</text>
</svg>`;
}

const splashLight = splashCentered(canvasLight, green, "#ffffff", "#17211d", "#7a8781");
const splashDark = splashCentered(canvasDark, green, "#ffffff", "#e8f1ec", "#8fa39a");

async function render(svg, file, size) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, file));
  console.log(`✓ ${file} (${size}x${size})`);
}

await mkdir(outDir, { recursive: true });
await render(iconOnly, "icon-only.png", 1024);
await render(iconForeground, "icon-foreground.png", 1024);
await render(iconBackground, "icon-background.png", 1024);
await render(splashLight, "splash.png", 2732);
await render(splashDark, "splash-dark.png", 2732);

// Web favicon source (Next.js serves src/app/icon.png automatically).
await sharp(Buffer.from(iconOnly), { density: 300 })
  .resize(512, 512)
  .png()
  .toFile(path.resolve(import.meta.dirname, "..", "src", "app", "icon.png"));
console.log("✓ src/app/icon.png (512x512 web favicon)");
