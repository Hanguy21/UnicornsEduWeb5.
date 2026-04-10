/**
 * Xử lý mọi *.png trong image/logo/:
 * 1) trim viền đồng nhất (threshold)
 * 2) đặt vào canvas vuông, căn giữa, margin trong suốt ~2–3px mỗi phía (tổng cạnh = max(w,h) + 2*PAD)
 * 3) (tuỳ chọn) scale về cạnh tối đa LOGO_MAX_EDGE (mặc định 1024) để gọn cho web
 * Env: LOGO_PAD_PX (2–8, mặc định 3), LOGO_TRIM_THRESHOLD (0=tắt, mặc định 14), LOGO_MAX_EDGE (0=không scale, mặc định 1024)
 * Chạy từ apps/web: node scripts/square-trim-logos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoDir = path.join(__dirname, "..", "image", "logo");

const PAD = Math.min(8, Math.max(2, Number(process.env.LOGO_PAD_PX) || 3));

const TRIM_THRESHOLD = (() => {
  const raw = process.env.LOGO_TRIM_THRESHOLD;
  if (raw === "0" || raw === "") return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.min(100, n);
  return 14;
})();

const MAX_EDGE = (() => {
  const raw = process.env.LOGO_MAX_EDGE;
  if (raw === "0" || raw === "") return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 256) return Math.min(4096, n);
  return 1024;
})();

async function toSquarePadded(buf) {
  let work = await sharp(buf).ensureAlpha().png().toBuffer();

  if (TRIM_THRESHOLD > 0) {
    try {
      work = await sharp(work).trim({ threshold: TRIM_THRESHOLD }).png().toBuffer();
    } catch (e) {
      console.warn("trim skip:", e?.message ?? e);
    }
  }

  const meta = await sharp(work).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) throw new Error("invalid dimensions after trim");

  const side = Math.max(w, h) + 2 * PAD;
  const left = Math.floor((side - w) / 2);
  const top = Math.floor((side - h) / 2);

  let out = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: work, left, top }])
    .png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true })
    .toBuffer();

  if (MAX_EDGE > 0 && side > MAX_EDGE) {
    out = await sharp(out)
      .resize(MAX_EDGE, MAX_EDGE, {
        kernel: sharp.kernel.lanczos3,
        fit: "fill",
      })
      .png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true })
      .toBuffer();
  }

  return out;
}

const files = fs
  .readdirSync(logoDir)
  .filter((f) => f.toLowerCase().endsWith(".png"));

if (files.length === 0) {
  console.error("No PNG files in", logoDir);
  process.exit(1);
}

for (const name of files) {
  const fp = path.join(logoDir, name);
  const before = (await fs.promises.stat(fp)).size;
  const raw = await fs.promises.readFile(fp);
  const meta0 = await sharp(raw).metadata();

  const out = await toSquarePadded(raw);
  await fs.promises.writeFile(fp, out);

  const after = out.length;
  const meta1 = await sharp(out).metadata();
  console.log(
    `${name}: ${before} → ${after} bytes | ${meta0.width}×${meta0.height} → ${meta1.width}×${meta1.height} | pad=${PAD}px, trim=${TRIM_THRESHOLD}, maxEdge=${MAX_EDGE || "off"}`,
  );
}
