import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFile } from "node:fs/promises";

const { privateKey, publicKey } = await generateKeyPair("RS256", {
  extractable: true,
});

const privatePem = await exportPKCS8(privateKey);
const jwk = await exportJWK(publicKey);

const jwks = JSON.stringify({
  keys: [
    {
      use: "sig",
      ...jwk,
    },
  ],
});

await writeFile("./jwt-private-key.txt", privatePem, "utf8");
await writeFile("./jwks.json", jwks, "utf8");

console.log("Created:");
console.log("  jwt-private-key.txt");
console.log("  jwks.json");
console.log("");
console.log("JWT_PRIVATE_KEY length:", privatePem.length);
console.log("JWKS length:", jwks.length);