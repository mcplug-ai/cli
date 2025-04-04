# MCPlug CLI

A command-line interface tool for bootstrapping MCP (Minecraft Custom Protocol) server projects using the streamable specification with [`@mcplug/server`](https://github.com/yourusername/mcplug-server).

## Overview

MCPlug CLI simplifies the process of creating new MCP server projects by providing templates for different deployment platforms. It's designed to help developers quickly set up the necessary boilerplate code so they can focus on building their server logic. Servers created with this CLI can be published to the MCPlug marketplace.

## Features

- 🚀 Quick project scaffolding for MCP servers
- 📦 Multiple deployment platform templates
  - Cloudflare Workers
  - Cloudflare Durable Objects
  - More platforms coming soon!
- 🔧 Automatic project configuration
- 📝 TypeScript support out of the box
- 🌐 Streamable specification compatibility
- 🏪 Designed for MCPlug marketplace publishing

## Installation

### Global Installation

```bash
npm install -g mcplug-cli
```

### Using npx (without installing)

```bash
npx mcplug-cli init
```

## Usage

### Creating a New Project

```bash
# If installed globally
mcplug init

# If using npx
npx mcplug-cli init
```

Follow the interactive prompts to:

1. Name your project
2. Select your deployment platform

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
├── .editorconfig
├── .prettierrc
├── package.json
├── README.md
├── tsconfig.json
├── worker-configuration.d.ts
└── wrangler.jsonc
```

### Development Workflow

After creating your project:

```bash
# Navigate to your project directory
cd your-project

# Install dependencies
npm install

# Start development server
npm run dev
```

## Templates

### Cloudflare Worker

A lightweight template for deploying MCP servers on Cloudflare Workers. Ideal for simple, stateless server implementations that follow the streamable specification.

### Cloudflare Durable Object

A more robust template that includes Durable Objects for maintaining state across requests. Perfect for building MCP servers that need to track sessions and state while adhering to the streamable specification.

## The MCPlug Marketplace

Servers built with this CLI are designed to be published to the MCPlug marketplace. The marketplace provides a platform for developers to share and monetize their MCP server implementations, allowing users to easily discover and use custom protocol servers.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests if you have suggestions for improvement or find any bugs.

## License

MIT

---

Built with ❤️ for the MCP community
