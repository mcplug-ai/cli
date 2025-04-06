#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const init = require("./commands/init");

// Set up the CLI program
program.name("mcplug").description("CLI tool for MCP server development with @mcplug/server").version("1.0.0");

// Add the init command
program.command("init [projectName]").description("Initialize a new MCP server project").action(init);

// Parse command line arguments
program.parse();
