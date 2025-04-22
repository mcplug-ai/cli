import { compile } from "json-schema-to-typescript";
import { fetch } from "undici";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export const generateTypes = async (id: string) => {
  const response = await fetch(`https://proxy.mcplug.ai/v1/types/${id}`);
  const data = (await response.json()) as {
    id: string;
    name: string;
    tools: Record<
      string,
      {
        name: string;
        input: any;
        output: any;
      }
    >;
  };
  const tools = Object.entries(data.tools);
  console.log(tools);
  const plugSchema = {
    type: "object",
    required: tools.map(([name]) => name),
    additionalProperties: false,
    properties: tools.reduce((acc, [name, tool]) => {
      Object.assign(acc, {
        [name]: {
          type: "object",
          properties: {
            IN: {
              ...tool.input,
              required: tool.input.required.filter((key) => !key.startsWith("_")),
              properties: Object.entries(tool.input.properties).reduce((acc, [key, value]) => {
                // Filter out constants
                if (key.startsWith("_")) {
                  return acc;
                }
                Object.assign(acc, {
                  [key]: value
                });
                return acc;
              }, {})
            },
            OUT: tool.output
          },
          additionalProperties: false,
          required: ["IN", "OUT"]
        }
      });
      return acc;
    }, {})
  } as const;

  console.dir(plugSchema, { depth: null });
  const types = await compile(plugSchema, data.name, {
    bannerComment: ""
  });
  // export interface JS4V4X1DVABP9RYHCTCMYHAX {
  const interfaceNameRegex = new RegExp(`export interface (\\w+) {`);
  const interfaceName = types.match(interfaceNameRegex)?.[1];
  const withoutFirstLine = types.replace(interfaceNameRegex, "");
  const globalType = `declare global{
  export type MCPLUG_${interfaceName} = import("@mcplug/client/ai").InferTools<{${withoutFirstLine}>
}
export {}
`;

  return {
    string: globalType,
    name: data.name
  };
};

/**
 * Find the default output directory for type declarations
 * @returns The path to the output directory (src if it exists, otherwise project root)
 */
const findDefaultOutputDir = (): string => {
  const srcDir = path.join(process.cwd(), "src");
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    return srcDir;
  }
  return process.cwd();
};

/**
 * CLI command to generate TypeScript type declarations for a McPlug plug ID
 */
export default async function types(id: string, options: { output?: string }): Promise<void> {
  try {
    if (!id) {
      console.error(chalk.red("Error: Plug ID is required"));
      console.log(chalk.yellow("Usage: npx mcplug types <ID> [--output <path>]"));
      process.exit(1);
    }

    console.log(chalk.blue(`🔍 Generating types for plug ID: ${id}`));

    // Generate the type definitions
    const result = await generateTypes(id);

    // Determine the output path
    const outputDir = options?.output || findDefaultOutputDir();
    await fs.ensureDir(outputDir);

    const outputFile = path.join(outputDir, `${result.name}.d.ts`);

    // Write the type declarations to the file
    await fs.writeFile(outputFile, result.string);

    console.log(chalk.green(`✅ Type declarations generated successfully at: ${outputFile}`));
  } catch (error) {
    console.error(chalk.red(`Error generating types: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
