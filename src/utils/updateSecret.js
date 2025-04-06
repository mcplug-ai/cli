const fs = require("fs-extra");
const path = require("path");
const { generateSecret } = require("./generateSecret");

/**
 * Updates the secret in the appropriate configuration file based on deployment type
 * @param {string} projectDir - Full path to the project directory
 * @param {string} deploymentType - Type of deployment (cloudflare-worker, cloudflare-durable-object, hono)
 * @returns {Promise<void>}
 */
async function updateSecret(projectDir, deploymentType) {
  // Generate a secure secret
  const secret = await generateSecret();

  if (deploymentType === "hono") {
    // Update .env file for Hono deployments
    const envPath = path.join(projectDir, ".env");

    if (await fs.pathExists(envPath)) {
      let envContent = await fs.readFile(envPath, "utf8");
      envContent = envContent.replace(/MCP_SECRET=.+/, `MCP_SECRET=${secret}`);
      await fs.writeFile(envPath, envContent);
    }
  } else if (deploymentType.startsWith("cloudflare")) {
    // Update wrangler.jsonc for Cloudflare deployments
    const wranglerPath = path.join(projectDir, "wrangler.jsonc");

    if (await fs.pathExists(wranglerPath)) {
      let wranglerContent = await fs.readFile(wranglerPath, "utf8");
      // Use a regex pattern that handles different formatting and whitespace
      wranglerContent = wranglerContent.replace(/"MCP_SECRET"\s*:\s*"[^"]*"/, `"MCP_SECRET": "${secret}"`);
      await fs.writeFile(wranglerPath, wranglerContent);
    }
  }
}

module.exports = updateSecret;
