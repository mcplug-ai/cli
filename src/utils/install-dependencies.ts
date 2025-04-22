import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { spawn } from "child_process";

/**
 * Response from the installDependencies function
 */
interface InstallResponse {
  installed: boolean;
  packageManager: string | null;
}

/**
 * Prompt user if they want to install dependencies and with which package manager
 * @param {string} projectDir - The directory where the project was created
 * @returns {Promise<InstallResponse>} - Returns install status and package manager used
 */
async function installDependencies(projectDir: string): Promise<InstallResponse> {
  try {
    // Ask if user wants to install dependencies
    const { shouldInstall } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldInstall",
        message: "Would you like to install dependencies now?",
        default: true
      }
    ]);

    if (!shouldInstall) {
      return { installed: false, packageManager: null };
    }

    // Ask which package manager to use
    const { packageManager } = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager would you like to use?",
        choices: [
          { name: "npm", value: "npm" },
          { name: "yarn", value: "yarn" },
          { name: "pnpm", value: "pnpm" },
          { name: "bun", value: "bun" }
        ],
        default: "npm"
      }
    ]);

    // Create spinner
    const spinner = ora({
      text: `Installing dependencies with ${packageManager}...`,
      color: "cyan"
    }).start();

    // Run the install command
    await runInstallCommand(packageManager, projectDir, spinner);
    return { installed: true, packageManager };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("Error installing dependencies:"), errorMessage);
    return { installed: false, packageManager: null };
  }
}

/**
 * Run the install command with the selected package manager
 * @param {string} packageManager - The package manager to use
 * @param {string} projectDir - The project directory
 * @param {ora.Ora} spinner - The spinner instance
 * @returns {Promise<void>}
 */
function runInstallCommand(packageManager: string, projectDir: string, spinner: ora.Ora): Promise<void> {
  return new Promise((resolve, reject) => {
    // Determine the installation command
    const installCmd = packageManager;
    const args: string[] = ["install"];

    if (packageManager === "yarn" || packageManager === "bun") {
      // yarn and bun don't need the "install" command
      args.length = 0;
    }

    // Spawn the process
    const child = spawn(installCmd, args, {
      cwd: projectDir,
      stdio: "pipe", // Capture output but don't show it while spinner is active
      shell: process.platform === "win32" // Use shell on Windows
    });

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    child.stdout?.on("data", (data) => {
      stdoutData += data.toString();
      // Update spinner text occasionally to show progress
      if (stdoutData.includes("added") || stdoutData.includes("packages")) {
        spinner.text = `Installing dependencies with ${packageManager}...`;
      }
    });

    // Capture stderr
    child.stderr?.on("data", (data) => {
      stderrData += data.toString();
      // Only update for actual errors, not warnings
      if (!stderrData.includes("WARN") && stderrData.trim().length > 0) {
        spinner.text = `Installing dependencies with ${packageManager}... ⚠️ Issues detected`;
      }
    });

    // Handle process completion
    child.on("close", (code) => {
      if (code === 0) {
        spinner.succeed(`Dependencies installed successfully with ${packageManager}!`);
        resolve();
      } else {
        spinner.fail(`Failed to install dependencies with ${packageManager}`);
        console.error(chalk.red("Error output:"), stderrData || stdoutData);
        reject(new Error(`Process exited with code ${code ?? 1}`));
      }
    });

    // Handle process errors
    child.on("error", (err) => {
      spinner.fail(`Failed to start ${packageManager}`);
      console.error(chalk.red(`Error: ${err.message}`));
      reject(err);
    });
  });
}

export default installDependencies;
