import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import installDependencies from "../utils/install-dependencies";

interface ProjectAnswers {
  projectName: string;
}

/**
 * Find the package root directory by looking for package.json
 * @returns The path to the package root
 */
function findPackageRoot(): string {
  // Start from the current file's directory
  let currentDir = __dirname;

  // Keep going up until we find package.json or reach the root
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // If we couldn't find it, return the current directory (may not work, but it's a fallback)
  return path.resolve(__dirname, "../..");
}

/**
 * Try to find template directory in various locations
 * @returns The path to the template directory or null if not found
 */
function findTemplateDir(): string | null {
  // Possible locations for template directory
  const possibleLocations = [
    // Standard location
    path.join(findPackageRoot(), "template"),
    // NPM global install location
    path.join(__dirname, "..", "..", "template"),
    // When run from dist directory
    path.join(__dirname, "..", "..", "..", "template"),
    // Current working directory
    path.join(process.cwd(), "template"),
    // Absolute path for global npm packages
    path.resolve(process.cwd(), "node_modules", "mcplug", "template")
  ];

  // Try to find in each location
  for (const location of possibleLocations) {
    console.log(chalk.yellow(`[Debug] Checking template directory at: ${location}`));
    if (fs.existsSync(location)) {
      return location;
    }
  }

  return null;
}

async function init(projectName?: string): Promise<void> {
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
    const questions: any[] = [];

    // Only ask for project name if not provided as an argument
    if (!projectName) {
      questions.push({
        type: "input",
        name: "projectName",
        message: "What is your project name?",
        validate: (input: string) => {
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

    // Get project details from user
    const answers = (await inquirer.prompt(questions)) as ProjectAnswers;

    // Use provided project name or the one from prompt
    const finalProjectName = projectName || answers.projectName;

    // Sanitize project name to avoid path issues
    const sanitizedProjectName = finalProjectName.trim().replace(/\s+/g, "-");
    const projectDir = path.join(process.cwd(), sanitizedProjectName);

    // Create project directory
    console.log(chalk.blue("\n📁 Creating project directory..."));
    await fs.ensureDir(projectDir);

    // Find template directory
    const templateDir = findTemplateDir();

    if (!templateDir) {
      console.error(chalk.red("\nCould not find template directory in any of the expected locations."));
      console.error(chalk.yellow("Please make sure the package is installed correctly."));

      // Offer to create a minimal project without template
      const { createMinimal } = await inquirer.prompt([
        {
          type: "confirm",
          name: "createMinimal",
          message: "Would you like to create a minimal project without using the template?",
          default: false
        }
      ]);

      if (!createMinimal) {
        throw new Error("Template directory not found. Installation may be corrupted.");
      }

      // Create minimal project
      console.log(chalk.blue("\nCreating minimal project structure..."));

      // Create src directory
      await fs.ensureDir(path.join(projectDir, "src"));

      // Create package.json
      const minimalPackageJson = {
        name: sanitizedProjectName.toLowerCase(),
        version: "0.1.0",
        description: "MCP server project",
        scripts: {
          dev: "vite",
          build: "vite build"
        }
      };

      await fs.writeJson(path.join(projectDir, "package.json"), minimalPackageJson, { spaces: 2 });

      // Create basic README.md
      await fs.writeFile(path.join(projectDir, "README.md"), `# ${finalProjectName}\n\nA MCP server project.\n`);

      console.log(chalk.yellow("\nCreated minimal project structure. You'll need to manually add the required files."));
      process.exit(0);
    }

    console.log(chalk.yellow(`\n[Debug] Using template directory: ${templateDir}`));

    // *** Debugging Start ***
    try {
      const templateFiles = await fs.readdir(templateDir);
      console.log(chalk.yellow(`[Debug] Files in template directory: ${templateFiles.join(", ")}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`[Debug] Error reading template directory: ${errorMessage}`));
    }
    console.log(chalk.yellow(`[Debug] Project directory: ${projectDir}`));
    // *** Debugging End ***

    console.log(chalk.blue(`\n📋 Copying template files...`));
    try {
      await fs.copy(templateDir, projectDir);
      console.log(chalk.yellow("[Debug] fs.copy command finished."));
    } catch (copyError) {
      const errorMessage = copyError instanceof Error ? copyError.message : String(copyError);
      console.error(chalk.red(`[Debug] Error during fs.copy: ${errorMessage}`));
      if (copyError instanceof Error && copyError.stack) {
        console.error(copyError.stack);
      }
      throw copyError;
    }

    // *** Debugging Start ***
    try {
      const projectFiles = await fs.readdir(projectDir);
      console.log(chalk.yellow(`[Debug] Files in project directory after copy: ${projectFiles.join(", ")}`));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`[Debug] Error reading project directory after copy: ${errorMessage}`));
    }
    // *** Debugging End ***

    // Check if package.json exists after copy
    const packageJsonPath = path.join(projectDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      console.error(chalk.red(`Error: package.json not found in ${projectDir} after copying.`));
      console.error(chalk.yellow(`Template directory was: ${templateDir}`));
      throw new Error("File copying failed or package.json was missing from the template.");
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
      readmeContent = `# ${finalProjectName}\n\n`;
    }

    readmeContent = readmeContent.replace(/# .*/, `# ${finalProjectName}`);

    await fs.writeFile(readmePath, readmeContent);

    // Rename .gitignore.example to .gitignore
    const gitignoreExamplePath = path.join(projectDir, ".gitignore.example");
    const gitignorePath = path.join(projectDir, ".gitignore");

    if (fs.existsSync(gitignoreExamplePath)) {
      try {
        await fs.rename(gitignoreExamplePath, gitignorePath);
      } catch (renameError) {
        const errorMessage = renameError instanceof Error ? renameError.message : String(renameError);
        console.warn(chalk.yellow(`Warning: Could not rename .gitignore.example: ${errorMessage}`));
      }
    }

    console.log(chalk.green("\n✨ Project initialized successfully!"));
    console.log(chalk.blue("\nProject structure:"));

    // Display project structure
    console.log(
      chalk.white(`
${sanitizedProjectName}/
├── src/
│   └── index.ts
├── tests/
├── changelogs/
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── .env`)
    );

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

    // Show information about MCPLUG_TOKEN and publishing
    console.log(chalk.blue("\n📋 Important:"));
    console.log(
      chalk.white(`
Before publishing your MCP server, make sure to:

1. Update the ${chalk.yellow("MCPLUG_TOKEN")} in your ${chalk.cyan(".env")} file with your token from mcplug.ai
2. Update the ${chalk.cyan("README.md")} with detailed information about your MCP server
3. Add your changes to ${chalk.cyan("changelogs/")} directory to document your updates
`)
    );

    console.log(chalk.blue("🚀 Publishing:"));
    console.log(
      chalk.white(`
When you're ready to publish your MCP server to the marketplace:

${chalk.cyan(`${installed ? packageManager : "npm"} run publish`)}

This will build your project and publish it to mcplug.ai where others can discover and use it!
`)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("Error:"), errorMessage);
    process.exit(1);
  }
}

export default init;
