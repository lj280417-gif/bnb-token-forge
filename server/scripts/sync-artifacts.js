const fs = require("fs");
const path = require("path");

console.log("Sincronizando artefactos de contratos hacia el backend...");

const sourceArtifact = path.resolve(__dirname, "../../contracts/artifacts/contracts/StandardBEP20.sol/StandardBEP20.json");
const sourceFlattened = path.resolve(__dirname, "../../contracts/flattened/StandardBEP20_flattened.sol");
const sourceSol = path.resolve(__dirname, "../../contracts/contracts/StandardBEP20.sol");

const targetDir = path.resolve(__dirname, "../src/contracts");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetArtifact = path.join(targetDir, "StandardBEP20.json");
const targetFlattened = path.join(targetDir, "StandardBEP20_flattened.sol");
const targetSol = path.join(targetDir, "StandardBEP20.sol");

if (fs.existsSync(sourceArtifact)) {
  fs.copyFileSync(sourceArtifact, targetArtifact);
  console.log("✔ Artefacto copiado a:", targetArtifact);
} else {
  console.warn("⚠ No se encontró el artefacto en:", sourceArtifact);
}

if (fs.existsSync(sourceFlattened)) {
  fs.copyFileSync(sourceFlattened, targetFlattened);
  console.log("✔ Contrato aplanado copiado a:", targetFlattened);
}

if (fs.existsSync(sourceSol)) {
  fs.copyFileSync(sourceSol, targetSol);
  console.log("✔ Contrato base copiado a:", targetSol);
}

console.log("Sincronización completada exitosamente.");
