import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { fetch, FormData } from "undici";
import { spawn } from "child_process";
import inquirer from "inquirer";
import semver from "semver";

interface ProjectDefinition {
  name: string;
  version: string;
  github?: string;
  website?: string;
  env?: Record<string, any>;
  tools?: any[] | Record<string, any>;
  prompts?: any[];
  resources?: any[];
}

interface ToolSchemaValidation {
  isValid: boolean;
  errors: string[];
}

interface ProjectValidation {
  isValid: boolean;
  errors: string[];
}

interface PublishResponse {
  url: string;
  version: string;
  id: string;
  [key: string]: any;
}

/**
 * Validates that all tools have a defined output schema
 * @param {ProjectDefinition} definition - The project definition
 * @returns {ToolSchemaValidation} - Validation result with isValid and errors properties
 */
function validateToolSchemas(definition: ProjectDefinition): ToolSchemaValidation {
  const errors: string[] = [];

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
 * @param {ProjectDefinition} definition - The project definition
 * @returns {ProjectValidation} - Validation result with isValid and errors properties
 */
function validateProject(definition: ProjectDefinition): ProjectValidation {
  const errors: string[] = [];

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
async function displayDefinitionSummary(definitionPath: string): Promise<boolean> {
  try {
    const definitionContent = fs.readFileSync(definitionPath, "utf8");
    const definition: ProjectDefinition = JSON.parse(definitionContent);

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

    console.log(chalk.cyan("\n📋 Server Summary:"));
    console.log(chalk.white("------------------------"));
    console.log(chalk.white(`Name: ${chalk.green(definition.name)}`));
    console.log(chalk.white(`Version: ${chalk.green(definition.version)}`));
    console.log(chalk.white(`GitHub: ${chalk.green(definition.github || "Not specified")}`));
    console.log(chalk.white(`Website: ${chalk.green(definition.website || "Not specified")}`));

    // Count environment variables
    const envVarsCount = definition.env ? Object.keys(definition.env).length : 0;
    console.log(chalk.white(`Environment Variables: ${chalk.green(envVarsCount)}`));

    // Count tools, prompts, and resources
    const toolsCount = definition.tools
      ? Array.isArray(definition.tools)
        ? definition.tools.length
        : Object.keys(definition.tools).length
      : 0;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error displaying definition summary: ${errorMessage}`));
    return false;
  }
}

/**
 * Run vite build command to build the project
 * @param {ora.Ora} spinner - The spinner instance
 * @returns {Promise<void>}
 */
function runViteBuild(spinner: ora.Ora): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if vite is installed
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = fs.readJsonSync(packageJsonPath, { throws: false });

    if (!packageJson || (!packageJson.dependencies?.vite && !packageJson.devDependencies?.vite)) {
      reject(new Error("Vite not found in package.json dependencies or devDependencies"));
      return;
    }

    // Spawn the process
    const child = spawn("npm", ["run", "build"], {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: process.platform === "win32"
    });

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    child.stdout?.on("data", (data) => {
      stdoutData += data.toString();
      // Update spinner text occasionally to show progress
      if (stdoutData.includes("building") || stdoutData.includes("bundling")) {
        spinner.text = "Building project... (bundling)";
      } else if (stdoutData.includes("rendering") || stdoutData.includes("writing")) {
        spinner.text = "Building project... (rendering)";
      }
    });

    // Capture stderr
    child.stderr?.on("data", (data) => {
      stderrData += data.toString();
      // Only update for actual errors, not warnings
      if (!stderrData.includes("WARN") && stderrData.trim().length > 0) {
        spinner.text = "Building project... ⚠️ Issues detected";
      }
    });

    // Handle process completion
    child.on("close", (code) => {
      if (code === 0) {
        spinner.text = "Project built successfully!";
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code ?? 1}\n${stderrData || stdoutData}`));
      }
    });

    // Handle process errors
    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Publishes the MCP server to mcplug.ai
 */
async function publish(): Promise<void> {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
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
    let definition: string;
    try {
      definition = fs.readFileSync(definitionPath, "utf8");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error reading definition.json: ${errorMessage}`));
      process.exit(1);
    }

    // Read the worker.js file
    let workerContent: Buffer;
    try {
      workerContent = fs.readFileSync(workerPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error reading worker.js: ${errorMessage}`));
      process.exit(1);
    }

    // Check for MCPLUG_TOKEN environment variable
    let token = process.env.MCPLUG_TOKEN;

    // If token not found in environment, check .env file
    if (!token) {
      const envFilePath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envFilePath)) {
        try {
          const envContent = fs.readFileSync(envFilePath, "utf8");
          const envLines = envContent.split("\n");
          for (const line of envLines) {
            if (line.startsWith("MCPLUG_TOKEN=")) {
              token = line.replace("MCPLUG_TOKEN=", "").trim();
              break;
            }
          }
        } catch (error) {
          // Ignore errors reading .env file
        }
      }
    }

    // If token still not found, ask the user
    if (!token) {
      const { userToken } = await inquirer.prompt([
        {
          type: "input",
          name: "userToken",
          message: "Please enter your MCPLUG_TOKEN:",
          validate: (input: string) => {
            if (input.trim().length === 0) {
              return "Token is required";
            }
            return true;
          }
        }
      ]);
      token = userToken;
    }

    // Upload to the MCP server
    spinner.text = "Uploading to mcplug.ai...";
    spinner.start();

    try {
      // Create form data
      const formData = new FormData();
      formData.append("definition", definition);
      formData.append("worker", workerContent);

      // Upload to the API
      const response = await fetch("https://api.mcplug.ai/api/plugin/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        spinner.fail("Failed to publish");
        console.error(chalk.red(`Error: Server responded with status ${response.status}`));
        console.error(chalk.red(`Server message: ${errorText || "No additional information"}`));
        process.exit(1);
      }

      // Parse the response
      const result = (await response.json()) as PublishResponse;

      spinner.succeed("Published successfully!");

      // Display publication details
      console.log(chalk.green("\n✨ MCP server published successfully!"));
      console.log(chalk.white("\nPublication details:"));
      console.log(chalk.white(`URL: ${chalk.cyan(result.url)}`));
      console.log(chalk.white(`Version: ${chalk.cyan(result.version)}`));
      console.log(chalk.white(`Publication ID: ${chalk.cyan(result.id)}`));

      console.log(chalk.green("\nYour MCP server is now available in the mcplug.ai marketplace!"));
    } catch (error) {
      spinner.fail("Failed to publish");
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("Error:"), errorMessage);
    process.exit(1);
  }
}

export default publish;
