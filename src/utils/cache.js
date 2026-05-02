import fs from "fs";

export function saveCache(file, data) {
  fs.writeFileSync(`./cache/${file}`, JSON.stringify(data, null, 2));
}

export function loadCache(file) {
  try {
    return JSON.parse(fs.readFileSync(`./cache/${file}`));
  } catch {
    return null;
  }
}