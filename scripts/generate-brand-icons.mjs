// Regenerate all raster app icons from the canonical vector.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const source = await readFile(new URL("../src/app/icon.svg", import.meta.url));
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(
  new URL("../src/app/favicon.ico", import.meta.url),
  Buffer.concat([header, ...images]),
);
await sharp({
  create: { width: 180, height: 180, channels: 4, background: "#f7f6fa" },
})
  .composite([
    {
      input: await sharp(source).resize(150, 150).png().toBuffer(),
      gravity: "centre",
    },
  ])
  .png()
  .toFile(new URL("../src/app/apple-icon.png", import.meta.url).pathname);
