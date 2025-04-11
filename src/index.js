#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const init = require("./commands/init");
const publish = require("./commands/publish");

// Set up the CLI program
program.name("mcplug").description("CLI tool for MCP server development with @mcplug/server").version("1.0.0");

// Add the init command
program.command("init [projectName]").description("Initialize a new MCP server project").action(init);

// Add the publish command
program.command("publish").description("Publish your MCP server to mcplug.ai").action(publish);

// Parse command line arguments
program.parse();
