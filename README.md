# MCPlug CLI

A command-line interface tool for bootstrapping MCP (Minecraft Custom Protocol) server projects using the streamable specification with [`@mcplug/server`](https://github.com/yourusername/mcplug-server).

## Overview

MCPlug CLI simplifies the process of creating new MCP server projects by providing templates for different deployment platforms. It's designed to help developers quickly set up the necessary boilerplate code so they can focus on building their server logic. Servers created with this CLI can be published to the MCPlug marketplace.

## Features

- 🚀 Quick project scaffolding for MCP servers
- 📦 Multiple deployment platform templates
  - Cloudflare Workers
  - Cloudflare Durable Objects
  - Hono
  - More platforms coming soon!
- 🔧 Automatic project configuration
- 🔐 Secure random secret generation
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
2. Selecting your deployment platform
3. Choosing whether to install dependencies
4. Selecting your preferred package manager (npm, yarn, pnpm, or bun)

### Project Structure

After initialization, your project will be created with the following structure (varies by template):

#### Cloudflare Worker Template

```
your-project/
├── src/
│   └── index.ts
├── .editorconfig
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
├── worker-configuration.d.ts
└── wrangler.jsonc
```

#### Cloudflare Durable Object Template

```
your-project/
├── src/
│   └── index.ts (with customized Durable Object class name)
├── .editorconfig
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
├── worker-configuration.d.ts
└── wrangler.jsonc
```

#### Hono Template

```
your-project/
├── src/
│   └── index.ts
├── package.json
├── README.md
├── tsconfig.json
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

## Security

The CLI automatically generates a secure random secret for your project:

- For Cloudflare templates, it updates the `MCP_SECRET` in wrangler.jsonc
- For Hono templates, it updates the `MCP_SECRET` in the .env file

This ensures that each project has a unique, secure secret rather than using default placeholder values.

## Customization

For Cloudflare Durable Object templates, the CLI automatically customizes:

- The Durable Object class name to match your project name (in PascalCase with "Durable" suffix)
- The binding name in UPPER_SNAKE_CASE format
- All related references in source files and configuration

## Templates

### Cloudflare Worker

A lightweight template for deploying MCP servers on Cloudflare Workers. Ideal for simple, stateless server implementations that follow the streamable specification.

### Cloudflare Durable Object

A more robust template that includes Durable Objects for maintaining state across requests. Perfect for building MCP servers that need to track sessions and state while adhering to the streamable specification.

### Hono

A template for building MCP servers using the Hono framework, providing a lightweight, Express-like experience for Node.js deployments.

## The MCPlug Marketplace

Servers built with this CLI are designed to be published to the MCPlug marketplace. The marketplace provides a platform for developers to share and monetize their MCP server implementations, allowing users to easily discover and use custom protocol servers.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests if you have suggestions for improvement or find any bugs.

## License

MIT

---

Built with ❤️ for the MCP community
