import fs from "fs";
import path from "path";

/**
 * Garante que a pasta /cache exista
 */
function ensureCacheDir() {
  const dir = path.resolve("./cache");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * Salva dados no cache
 * @param {string} file - nome do arquivo (ex: leads.json)
 * @param {any} data - dados para salvar
 */
export function saveCache(file, data) {
  try {
    const dir = ensureCacheDir();
    const filePath = path.join(dir, file);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Erro ao salvar cache:", err.message);
  }
}

/**
 * Carrega dados do cache
 * @param {string} file - nome do arquivo
 * @returns {any|null}
 */
export function loadCache(file) {
  try {
    const filePath = path.resolve("./cache", file);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf8");

    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao carregar cache:", err.message);
    return null;
  }
}