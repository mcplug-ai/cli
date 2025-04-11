const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const ora = require("ora");
const undici = require("undici");
const { spawn } = require("child_process");
const inquirer = require("inquirer");
const semver = require("semver");
// const slug = require("slug");

const fetch = undici.fetch;
const FormData = undici.FormData;

/**
 * Validates that all tools have a defined output schema
 * @param {Object} definition - The project definition
 * @returns {Object} - Validation result with isValid and errors properties
 */
function validateToolSchemas(definition) {
  const errors = [];

  if (!definition.tools) {
    return { isValid: true, errors };
  }

  // Check if tools is an array or object
  const tools = Array.isArray(definition.tools) ? definition.tools : Object.values(definition.tools);

  for (const tool of tools) {
    if (!tool.name) {
      errors.push("Found a tool without a name");
      continue;
    }

    if (!tool.outputSchema || (tool.outputSchema.type === "object" && Object.keys(tool.outputSchema).length === 1)) {
      errors.push(`Tool "${tool.name}" has an undefined output schema`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates the project name and version
 * @param {Object} definition - The project definition
 * @returns {Object} - Validation result with isValid and errors properties
 */
function validateProject(definition) {
  const errors = [];

  // Validate version (semantic versioning)
  if (!definition.version) {
    errors.push("Version is missing in the definition");
  } else if (!semver.valid(definition.version)) {
    errors.push(`Version "${definition.version}" is not a valid semantic version`);
  }

  // Validate tool schemas
  const schemaValidation = validateToolSchemas(definition);
  if (!schemaValidation.isValid) {
    errors.push(...schemaValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Displays a summary of the definition.json file and prompts for confirmation
 * @param {string} definitionPath - Path to the definition.json file
 * @returns {Promise<boolean>} - Whether the user confirmed to proceed
 */
async function displayDefinitionSummary(definitionPath) {
  try {
    const definitionContent = fs.readFileSync(definitionPath, "utf8");
    const definition = JSON.parse(definitionContent);

    // Validate project name and version
    const validation = validateProject(definition);
    if (!validation.isValid) {
      console.error(chalk.red("\n❌ Validation errors:"));
      validation.errors.forEach((error) => {
        console.error(chalk.red(`  - ${error}`));
      });
      console.error(chalk.yellow("\nPublishing aborted due to validation errors."));
      return false;
    }

    console.log(chalk.cyan("\n📋 Server Summary:"), chalk.gray("(Extracted from package.json)"));
    console.log(chalk.white("------------------------"));
    console.log(chalk.white(`Name: ${chalk.green(definition.name)}`));
    console.log(chalk.white(`Version: ${chalk.green(definition.version)}`));
    console.log(chalk.white(`GitHub: ${chalk.green(definition.github || "Not specified")}`));
    console.log(chalk.white(`Website: ${chalk.green(definition.website || "Not specified")}`));

    // Count environment variables
    const envVarsCount = definition.env ? Object.keys(definition.env).length : 0;
    console.log(chalk.white(`Environment Variables: ${chalk.green(envVarsCount)}`));

    // Count tools, prompts, and resources
    const toolsCount = definition.tools ? definition.tools.length : 0;
    const promptsCount = definition.prompts ? definition.prompts.length : 0;
    const resourcesCount = definition.resources ? definition.resources.length : 0;

    console.log(chalk.white(`Tools: ${chalk.green(toolsCount)}`));
    console.log(chalk.white(`Prompts: ${chalk.green(promptsCount)}`));
    console.log(chalk.white(`Resources: ${chalk.green(resourcesCount)}`));
    console.log(chalk.white("------------------------"));

    // Prompt for confirmation
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.yellow("Do you want to proceed with publishing?"),
        default: true
      }
    ]);

    return confirm;
  } catch (error) {
    console.error(chalk.red(`Error displaying definition summary: ${error.message}`));
    return false;
  }
}

/**
 * Publishes the MCP server to mcplug.ai
 */
async function publish() {
  try {
    const spinner = ora({ text: "Building project...", color: "cyan" }).start();

    // Check if we're in an MCP server project
    if (!fs.existsSync(path.join(process.cwd(), "package.json"))) {
      spinner.fail("Not in an MCP server project directory");
      console.error(chalk.red("Error: Could not find package.json"));
      process.exit(1);
    }

    // Run vite build and wait for it to complete
    try {
      await runViteBuild(spinner);
    } catch (error) {
      spinner.fail("Failed to build project");
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }

    spinner.text = "Preparing to publish...";
    spinner.succeed();

    // Check for the .mcplug/.build directory
    const buildDir = path.join(process.cwd(), ".mcplug", ".build");
    if (!fs.existsSync(buildDir)) {
      console.error(chalk.red("Error: .mcplug/.build directory not found. Make sure you have built your project."));
      process.exit(1);
    }

    // Check for definition.json and worker.js files
    const definitionPath = path.join(buildDir, "definition.json");
    const workerPath = path.join(buildDir, "worker.js");

    if (!fs.existsSync(definitionPath)) {
      console.error(chalk.red("Error: definition.json not found in .mcplug/.build directory"));
      process.exit(1);
    }

    if (!fs.existsSync(workerPath)) {
      console.error(chalk.red("Error: worker.js not found in .mcplug/.build directory"));
      process.exit(1);
    }

    // Display definition summary and prompt for confirmation
    const confirmed = await displayDefinitionSummary(definitionPath);
    if (!confirmed) {
      console.log(chalk.yellow("Publishing cancelled by user."));
      process.exit(0);
    }

    // Read the definition.json file
    let definition;
    try {
      definition = fs.readFileSync(definitionPath, "utf8");
    } catch (error) {
      console.error(chalk.red(`Error reading definition.json: ${error.message}`));
      process.exit(1);
    }

    // Read the worker.js file
    let workerContent;
    try {
      workerContent = fs.readFileSync(workerPath);
    } catch (error) {
      console.error(chalk.red(`Error reading worker.js: ${error.message}`));
      process.exit(1);
    }

    // Read the MCPLUG_TOKEN from .env file
    let token;
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (!fs.existsSync(envPath)) {
        console.error(chalk.red("Error: .env file not found. Make sure you have a .env file with MCPLUG_TOKEN"));
        process.exit(1);
      }

      const envContent = fs.readFileSync(envPath, "utf8");
      const tokenMatch = envContent.match(/MCPLUG_TOKEN\s*=\s*(.+)/);

      if (!tokenMatch) {
        console.error(chalk.red("Error: MCPLUG_TOKEN not found in .env file"));
        process.exit(1);
      }

      token = tokenMatch[1].trim();
    } catch (error) {
      console.error(chalk.red(`Error reading .env file: ${error.message}`));
      process.exit(1);
    }

    // Create FormData and make the request
    const publishSpinner = ora({ text: "Publishing to mcplug.ai...", color: "cyan" }).start();

    try {
      const formData = new FormData();

      // Add the definition.json as a string to the payload property
      formData.append("payload", definition);

      // Add worker.js as a file
      const workerFile = new File([workerContent], "worker.js", { type: "application/javascript" });
      formData.append("file", workerFile);
      try {
        const response = await fetch("http://localhost:4200/api/webhooks/deploy", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.replace(/^"|"$/g, "")}`
          },
          body: formData
        });

        if (!response.ok) {
          let errorMessage = `Server responded with ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Ignore JSON parsing errors
          }

          publishSpinner.fail("Failed to publish");
          console.error(chalk.red(`Error: ${errorMessage}`));
          process.exit(1);
        }

        const data = await response.json();
        publishSpinner.succeed("Successfully published to mcplug.ai!");
        console.log(chalk.green("\n✨ Your MCP server has been published!"));
        console.log(chalk.blue("\nYou can view it at:"));
        console.log(chalk.white(`https://mcplug.ai/servers/${data.serverId || ""}`));
      } catch (error) {
        publishSpinner.fail("Failed to publish");
        console.error(chalk.red(`Error during publish: ${error.message}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("Error:"), error.message);
    process.exit(1);
  }
}

/**
 * Run vite build and wait for it to complete
 * @param {ora.Ora} spinner - The spinner instance
 * @returns {Promise<void>}
 */
function runViteBuild(spinner) {
  return new Promise((resolve, reject) => {
    // Determine the package manager to use
    let packageManager = "npm";
    if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) {
      packageManager = "yarn";
    } else if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (fs.existsSync(path.join(process.cwd(), "bun.lockb"))) {
      packageManager = "bun";
    }

    // Determine the command to run
    const command = packageManager === "npm" ? "npx" : packageManager;
    const args = packageManager === "npm" ? ["vite", "build"] : ["run", "build"];

    // Spawn the process
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: process.platform === "win32"
    });

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    child.stdout.on("data", (data) => {
      const output = data.toString();
      stdoutData += output;

      // Update spinner text to show progress
      if (output.includes("vite build")) {
        spinner.text = "Building project...";
      }

      // Check if the build is complete
      if (output.includes("vite build") && output.includes("done")) {
        spinner.succeed("Build completed successfully!");
        resolve();
      }
    });

    // Capture stderr
    child.stderr.on("data", (data) => {
      const output = data.toString();
      stderrData += output;

      // Only update for actual errors, not warnings
      if (!output.includes("WARN") && output.trim().length > 0) {
        spinner.text = "Building project... ⚠️ Issues detected";
      }
    });

    // Handle process completion
    child.on("close", (code) => {
      if (code === 0) {
        // Build completed successfully
        spinner.succeed("Build completed successfully!");
        resolve();
      } else {
        spinner.fail("Failed to build project");
        console.error(chalk.red("Error output:"), stderrData || stdoutData);
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    // Handle process errors
    child.on("error", (err) => {
      spinner.fail("Failed to build project");
      console.error(chalk.red(`Error: ${err.message}`));
      reject(err);
    });
  });
}

module.exports = publish;
