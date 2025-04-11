# MCPlug CLI

A command-line interface tool for bootstrapping MCP (Minecraft Custom Protocol) server projects using the streamable specification with [`@mcplug/server`](https://github.com/yourusername/mcplug-server).

## Overview

MCPlug CLI simplifies the process of creating new MCP server projects. It's designed to help developers quickly set up the necessary boilerplate code so they can focus on building their server logic. Servers created with this CLI can be published to the MCPlug marketplace.

## Features

- 🚀 Quick project scaffolding for MCP servers
- 🔧 Automatic project configuration
- 📦 Package manager selection (npm, yarn, pnpm, bun)
- 📝 TypeScript support out of the box
- 🌐 Streamable specification compatibility
- 🏪 Designed for MCPlug marketplace publishing

## Usage

### Creating a New Project

```bash
# Create a new project with interactive prompts
npx mcplug init

# Create a new project with a specified name
npx mcplug init my-awesome-project
```

The CLI will guide you through:

1. Project name (if not provided as argument)
2. Choosing whether to install dependencies
3. Selecting your preferred package manager (npm, yarn, pnpm, or bun)

### Project Structure

After initialization, your project will be created with the following structure:

```
your-project/
├── src/
│   └── index.ts
├── changelogs/
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── .env
```

### Development Workflow

After creating your project, the CLI will provide you with next steps. If you chose to install dependencies, you can immediately start development:

```bash
# Navigate to your project directory
cd your-project

# Start development server
npm run dev  # or your chosen package manager: yarn dev, pnpm dev, bun dev
```

If you chose not to install dependencies, you'll need to install them first:

```bash
# Navigate to your project directory
cd your-project

# Install dependencies
npm install  # or your preferred package manager

# Start development server
npm run dev
```

## Publishing Your MCP Server

### Prerequisites

Before publishing your MCP server to the marketplace, make sure to:

1. **Update your token**: Replace the placeholder in your `.env` file with your actual MCPLUG_TOKEN from mcplug.ai

   ```
   MCPLUG_TOKEN="your-actual-token-here"
   ```

2. **Update the README**: Your README.md will be displayed on the marketplace, so make sure it contains:

   - Clear description of what your MCP server does
   - Examples of how to use it
   - Any configuration options
   - Links to related resources

3. **Document changes**: Add your changes to the `changelogs/` directory to keep track of updates and help users understand what's new.

### Publishing

When you're ready to share your MCP server with the world:

```bash
# Use your preferred package manager
npm run publish    # or yarn deploy, pnpm deploy, bun deploy
```

This command will build your project and publish it to the MCPlug marketplace where others can discover and use it.

## The MCPlug Marketplace

Servers built with this CLI are designed to be published to the MCPlug marketplace. The marketplace provides a platform for developers to share and monetize their MCP server implementations, allowing users to easily discover and use custom protocol servers.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests if you have suggestions for improvement or find any bugs.

## License

MIT

---

Built with ❤️ for the MCP community
