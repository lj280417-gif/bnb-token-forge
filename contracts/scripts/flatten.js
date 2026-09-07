const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Generando contrato aplanado (flattened) para BscScan...");

// Asegurar que existe la carpeta flattened
const flattenedDir = path.resolve(__dirname, "../flattened");
if (!fs.existsSync(flattenedDir)) {
  fs.mkdirSync(flattenedDir, { recursive: true });
}

// Eliminar el archivo duplicado anterior si existía en contracts/
const oldPath = path.resolve(__dirname, "../contracts/StandardBEP20_flattened.sol");
if (fs.existsSync(oldPath)) {
  fs.unlinkSync(oldPath);
}

// Ejecutar hardhat flatten
const rawFlattened = execSync("npx hardhat flatten contracts/StandardBEP20.sol", {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
});

// Limpiar múltiples SPDX License identifiers para dejar solo uno al inicio
let cleaned = rawFlattened.replace(/\/\/ SPDX-License-Identifier: [^\r\n]+/g, "");
cleaned = "// SPDX-License-Identifier: MIT\n" + cleaned.trim();

const targetPath = path.resolve(flattenedDir, "StandardBEP20_flattened.sol");
fs.writeFileSync(targetPath, cleaned, "utf8");

console.log("Contrato aplanado generado con éxito en:", targetPath);
