import ImageKit, { toFile } from "@imagekit/nodejs";
import config from "../config/config.js";

const client = new ImageKit({
  privateKey: config.IMAGEKIT_PRIVATE_KEY,
});

export async function uploadFiles({ buffer, fileName }) {
  const respones = await client.files.upload({
    file: await toFile(buffer),
    fileName: fileName,
    folder: "Snitch-Prototype",
  });

  return respones;
}
