const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const installDependencies = require("../utils/install-dependencies");
const updateSecret = require("../utils/updateSecret");
const updateDurableObjectName = require("../utils/updateDurableObjectName");

async function init(projectName) {
  try {
    // Validate project name if provided as argument
    if (projectName) {
      if (projectName.trim().length === 0) {
        console.error(chalk.red("Error: Project name is required"));
        process.exit(1);
      }
      // Check if the project name contains invalid characters
      if (/[<>:"/\\|?*]/.test(projectName)) {
        console.error(chalk.red("Error: Project name contains invalid characters"));
        process.exit(1);
      }
    }

    // Prepare questions array
    const questions = [];

    // Only ask for project name if not provided as an argument
    if (!projectName) {
      questions.push({
        type: "input",
        name: "projectName",
        message: "What is your project name?",
        validate: (input) => {
          if (input.trim().length === 0) {
            return "Project name is required";
          }
          // Check if the project name contains invalid characters
          if (/[<>:"/\\|?*]/.test(input)) {
            return "Project name contains invalid characters";
          }
          return true;
        }
      });
    }

    // Add deployment type selection
    questions.push({
      type: "list",
      name: "deploymentType",
      message: "Select deployment platform:",
      choices: [
        { name: "Cloudflare Worker", value: "cloudflare-worker" },
        {
          name: "Cloudflare Durable Object",
          value: "cloudflare-durable-object"
        },
        { name: "Hono", value: "hono" }
      ],
      default: "cloudflare-worker"
    });

    // Get project details from user
    const answers = await inquirer.prompt(questions);

    // Use provided project name or the one from prompt
    answers.projectName = projectName || answers.projectName;

    // Sanitize project name to avoid path issues
    const sanitizedProjectName = answers.projectName.trim().replace(/\s+/g, "-");
    const projectDir = path.join(process.cwd(), sanitizedProjectName);

    // Create project directory
    console.log(chalk.blue("\n📁 Creating project directory..."));
    await fs.ensureDir(projectDir);

    // Copy template files based on deployment type
    const templateDir = path.join(__dirname, "..", "..", "templates", answers.deploymentType);

    if (!fs.existsSync(templateDir)) {
      throw new Error(`Template directory for ${answers.deploymentType} not found at ${templateDir}`);
    }

    // *** Debugging Start ***
    console.log(chalk.yellow(`\n[Debug] Template directory: ${templateDir}`));
    try {
      const templateFiles = await fs.readdir(templateDir);
      console.log(chalk.yellow(`[Debug] Files in template directory: ${templateFiles.join(", ")}`));
    } catch (err) {
      console.error(chalk.red(`[Debug] Error reading template directory: ${err.message}`));
    }
    console.log(chalk.yellow(`[Debug] Project directory: ${projectDir}`));
    // *** Debugging End ***

    console.log(chalk.blue(`\n📋 Copying ${answers.deploymentType} template files...`));
    try {
      await fs.copy(templateDir, projectDir);
      console.log(chalk.yellow("[Debug] fs.copy command finished."));
    } catch (copyError) {
      console.error(chalk.red(`[Debug] Error during fs.copy: ${copyError.message}`));
      console.error(copyError.stack);
      throw copyError;
    }

    // *** Debugging Start ***
    try {
      const projectFiles = await fs.readdir(projectDir);
      console.log(chalk.yellow(`[Debug] Files in project directory after copy: ${projectFiles.join(", ")}`));
    } catch (err) {
      console.error(chalk.red(`[Debug] Error reading project directory after copy: ${err.message}`));
    }
    // *** Debugging End ***

    // Check if package.json exists after copy
    const packageJsonPath = path.join(projectDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      console.error(chalk.red(`Error: package.json not found in ${projectDir} after copying.`));
      console.error(chalk.yellow(`Template directory was: ${templateDir}`));
      // Optionally list directory contents for debugging
      // const dirContents = await fs.readdir(projectDir);
      // console.error(chalk.yellow(`Contents of ${projectDir}:`), dirContents);
      throw new Error("File copying failed or package.json was missing from the template.");
    }

    // Generate and update secret
    console.log(chalk.blue("\n🔑 Generating secure secret..."));
    await updateSecret(projectDir, answers.deploymentType);

    // Update Durable Object name if needed
    if (answers.deploymentType === "cloudflare-durable-object") {
      console.log(chalk.blue("\n🔄 Customizing Durable Object configuration..."));
      await updateDurableObjectName(projectDir, sanitizedProjectName);
    }

    // Update package.json with project details
    const packageJson = await fs.readJson(packageJsonPath);

    packageJson.name = sanitizedProjectName.toLowerCase();

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    // Update README.md with project details
    const readmePath = path.join(projectDir, "README.md");
    let readmeContent = "";

    if (fs.existsSync(readmePath)) {
      readmeContent = await fs.readFile(readmePath, "utf8");
    } else {
      readmeContent = `# ${answers.projectName}\n\n`;
    }

    readmeContent = readmeContent.replace(/# .*/, `# ${answers.projectName}`);

    await fs.writeFile(readmePath, readmeContent);

    // Update wrangler.jsonc with project details
    const wranglerPath = path.join(projectDir, "wrangler.jsonc");
    if (fs.existsSync(wranglerPath)) {
      let wranglerContent = await fs.readFile(wranglerPath, "utf8");
      wranglerContent = wranglerContent.replace(
        /"name"\s*:\s*"[^"]*"/,
        `"name": "${sanitizedProjectName.toLowerCase()}"`
      );
      await fs.writeFile(wranglerPath, wranglerContent);
    }

    console.log(chalk.green("\n✨ Project initialized successfully!"));
    console.log(chalk.blue("\nProject structure:"));

    // Display project structure based on deployment type
    if (answers.deploymentType === "cloudflare-worker") {
      console.log(
        chalk.white(`
${sanitizedProjectName}/
├── src/
│   └── index.ts
├── .editorconfig
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
├── worker-configuration.d.ts
└── wrangler.jsonc`)
      );
    } else if (answers.deploymentType === "cloudflare-durable-object") {
      console.log(
        chalk.white(`
${sanitizedProjectName}/
├── src/
├── .editorconfig
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
├── worker-configuration.d.ts
└── wrangler.jsonc`)
      );
    } else if (answers.deploymentType === "hono") {
      console.log(
        chalk.white(`
${sanitizedProjectName}/
├── src/
│   └── index.ts
├── package.json
├── README.md
├── tsconfig.json
└── .env`)
      );
    }

    // Install dependencies
    const { installed, packageManager } = await installDependencies(projectDir);

    // Show next steps
    console.log(chalk.blue("\nNext steps:"));

    if (installed) {
      console.log(
        chalk.white(`
1. cd ${sanitizedProjectName}
2. ${packageManager} run dev`)
      );
    } else {
      console.log(
        chalk.white(`
1. cd ${sanitizedProjectName}
2. npm install
3. npm run dev`)
      );
    }
  } catch (error) {
    console.error(chalk.red("Error:"), error.message);
    process.exit(1);
  }
}

module.exports = init;
