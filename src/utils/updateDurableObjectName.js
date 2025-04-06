const fs = require("fs-extra");
const path = require("path");

/**
 * Converts a string to camelCase with first letter capitalized
 * @param {string} str - The string to convert
 * @returns {string} - The converted string
 */
function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Converts a string to UPPER_SNAKE_CASE
 * @param {string} str - The string to convert
 * @returns {string} - The converted string
 */
function toUpperSnakeCase(str) {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.toUpperCase())
    .join("_");
}

/**
 * Updates the Durable Object name in all relevant files
 * @param {string} projectDir - Full path to the project directory
 * @param {string} projectName - The name of the project
 * @returns {Promise<void>}
 */
async function updateDurableObjectName(projectDir, projectName) {
  // Generate the new class name - PascalCase + "Durable"
  const durableClassName = `${toPascalCase(projectName)}Durable`;

  // Generate the binding name - UPPER_SNAKE_CASE
  const bindingName = `${toUpperSnakeCase(projectName)}_DURABLE_MCP`;

  // Update the index.ts file
  const indexPath = path.join(projectDir, "src", "index.ts");
  if (await fs.pathExists(indexPath)) {
    let indexContent = await fs.readFile(indexPath, "utf8");

    // Replace class name and its reference
    indexContent = indexContent
      .replace(/export class MyDurableMcp/g, `export class ${durableClassName}`)
      .replace(/name: 'MyDurableMcp'/g, `name: '${durableClassName}'`)
      .replace(/'1.0.0': 'MyDurableMcp'/g, `'1.0.0': '${bindingName}'`);

    await fs.writeFile(indexPath, indexContent);
  }

  // Update the wrangler.jsonc file
  const wranglerPath = path.join(projectDir, "wrangler.jsonc");
  if (await fs.pathExists(wranglerPath)) {
    let wranglerContent = await fs.readFile(wranglerPath, "utf8");

    // Replace binding name and class name
    wranglerContent = wranglerContent
      .replace(/"name":\s*"MY_DURABLE_MCP"/g, `"name": "${bindingName}"`)
      .replace(/"class_name":\s*"MyDurableMcp"/g, `"class_name": "${durableClassName}"`)
      .replace(/"new_sqlite_classes":\s*\[\s*"MyDurableMcp"\s*\]/g, `"new_sqlite_classes": ["${durableClassName}"]`);

    await fs.writeFile(wranglerPath, wranglerContent);
  }

  // Update worker-configuration.d.ts
  const workerConfigPath = path.join(projectDir, "worker-configuration.d.ts");
  if (await fs.pathExists(workerConfigPath)) {
    let configContent = await fs.readFile(workerConfigPath, "utf8");

    // Replace the binding name and class reference
    configContent = configContent
      .replace(/MY_DURABLE_MCP:/g, `${bindingName}:`)
      .replace(/import\('\.\/src\/index'\)\.MyDurableMcp/g, `import('./src/index').${durableClassName}`);

    await fs.writeFile(workerConfigPath, configContent);
  }
}

module.exports = updateDurableObjectName;
