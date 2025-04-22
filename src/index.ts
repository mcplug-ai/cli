import { program } from "commander";
import init from "./commands/init";
import publish from "./commands/publish";
import types from "./commands/types";

// Set up the CLI program
program.name("mcplug").description("CLI tool for MCP server development with @mcplug/server").version("1.2.37");

// Add the init command
program.command("init [projectName]").description("Initialize a new MCP server project").action(init);

// Add the publish command
program.command("publish").description("Publish your MCP server to mcplug.ai").action(publish);

// Add the types command
program
  .command("types <id>")
  .description("Generate TypeScript type declarations for a McPlug plug ID")
  .option("-o, --output <path>", "Output directory for the generated type declarations")
  .action(types);

// Parse command line arguments
program.parse();
