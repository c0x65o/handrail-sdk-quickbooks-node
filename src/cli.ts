import { HandrailQuickBooksClient } from "./client.js";
import {
  HandrailQuickBooksConfigError,
  HandrailQuickBooksError
} from "./errors.js";
import {
  HANDRAIL_QUICKBOOKS_ENV_KEYS,
  createQuickBooksSdkConfig
} from "./runtime.js";
import { commands, helpText, resolveCommand } from "./cli/commands/index.js";
import { parseCliArgs } from "./cli/parser.js";
import type {
  CliCommandContext,
  CliGlobalConfig,
  CliOutput,
  CliQuickBooksClient
} from "./cli/types.js";

export interface RunCliOptions {
  readonly createClient?: (config: CliGlobalConfig) => CliQuickBooksClient;
  readonly env?: NodeJS.ProcessEnv;
  readonly stderr?: CliOutput;
  readonly stdout?: CliOutput;
}

export async function runCli(argv: readonly string[], options: RunCliOptions = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const env = options.env ?? process.env;

  try {
    const parsed = parseCliArgs(argv);

    if (parsed.help || parsed.positionals.length === 0) {
      stdout.write(`${helpText()}\n`);
      return 0;
    }

    const command = resolveCommand(parsed.positionals);
    if (!command) {
      stderr.write(
        `Unknown command: ${parsed.positionals.join(" ")}\n\n${helpText()}\n`
      );
      return 2;
    }

    if (command.help) {
      stdout.write(`${helpText(command.name)}\n`);
      return 0;
    }

    const config = resolveGlobalConfig(parsed.flags, env);
    const missing = missingRequiredConfig(config);
    if (missing.length > 0) {
      stderr.write(
        `Missing required configuration: ${missing.join(", ")}.\n` +
          "Provide values with flags or env: --tenant-id/HANDRAIL_QBO_TENANT_ID, " +
          "--api-key/HANDRAIL_QBO_API_KEY.\n"
      );
      return 2;
    }

    const client =
      options.createClient?.(config) ??
      new HandrailQuickBooksClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        providerMode: config.providerMode,
        retries: config.retries,
        tenantId: config.tenantId,
        timeoutMs: config.timeoutMs
      });
    const context: CliCommandContext = {
      client,
      config,
      flags: parsed.flags,
      positionals: command.args,
      stderr,
      stdout
    };

    const result = await command.run(context);
    stdout.write(`${JSON.stringify(sanitizeCliOutput(result), null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${formatCliError(error)}\n`);
    return error instanceof HandrailQuickBooksConfigError ? 2 : 1;
  }
}

function resolveGlobalConfig(
  flags: ReadonlyMap<string, string | true>,
  env: NodeJS.ProcessEnv
): CliGlobalConfig {
  const explicitBaseUrl = flagValue(flags, "base-url");
  const explicitProviderMode = flagValue(flags, "provider-mode");
  const envBaseUrl = env[HANDRAIL_QUICKBOOKS_ENV_KEYS.baseUrl]?.trim();
  const resolvedSdkConfig = createQuickBooksSdkConfig(
    {
      baseUrl: explicitBaseUrl,
      providerMode: explicitProviderMode as CliGlobalConfig["providerMode"]
    },
    env
  );

  return {
    apiKey: flagValue(flags, "api-key") ?? env[HANDRAIL_QUICKBOOKS_ENV_KEYS.apiKey]?.trim(),
    baseUrlOverride: explicitBaseUrl || envBaseUrl
      ? {
        envName: HANDRAIL_QUICKBOOKS_ENV_KEYS.baseUrl,
        flagName: "--base-url",
        present: true,
        scope: "local_operator_override_only"
      }
      : undefined,
    baseUrl: resolvedSdkConfig.baseUrl,
    providerMode: resolvedSdkConfig.providerMode,
    retries: optionalNumber(flags, "retries"),
    serviceEnv: resolvedSdkConfig.serviceEnv,
    tenantId:
      flagValue(flags, "tenant-id") ??
      flagValue(flags, "tenant") ??
      env[HANDRAIL_QUICKBOOKS_ENV_KEYS.tenantId]?.trim(),
    tenantMapJson: env[HANDRAIL_QUICKBOOKS_ENV_KEYS.tenantMapJson]?.trim(),
    timeoutMs: optionalNumber(flags, "timeout-ms")
  };
}

function missingRequiredConfig(config: CliGlobalConfig) {
  const missing: string[] = [];
  if (!config.tenantId) {
    missing.push("tenantId");
  }
  if (!config.apiKey) {
    missing.push("apiKey");
  }
  return missing;
}

function flagValue(flags: ReadonlyMap<string, string | true>, key: string) {
  const value = flags.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(flags: ReadonlyMap<string, string | true>, key: string) {
  const value = flagValue(flags, key);
  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new HandrailQuickBooksConfigError(`--${key} must be a number.`);
  }

  return number;
}

function formatCliError(error: unknown) {
  if (error instanceof HandrailQuickBooksError) {
    const parts = [
      error.message,
      error.code ? `code=${error.code}` : undefined,
      error.status ? `status=${error.status}` : undefined,
      error.requestId ? `requestId=${error.requestId}` : undefined,
      error.retryable ? "retryable=true" : undefined
    ].filter((part): part is string => Boolean(part));
    return parts.join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Handrail QuickBooks CLI failed.";
}

const UNSAFE_CLI_OUTPUT_KEYS = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "clientid",
  "clientsecret",
  "credential",
  "credentials",
  "oauthcredentials",
  "payload",
  "providererror",
  "queryresponse",
  "rawobject",
  "rawpayload",
  "rawprovidererror",
  "rawproviderpayload",
  "rawquickbooksobject",
  "refreshtoken",
  "token"
]);

const SAFE_PAYLOAD_REFERENCE_KEYS = new Set([
  "rawpayloadprovenance",
  "sourcepayloadref",
  "sourcepayloadrefs"
]);

function sanitizeCliOutput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeCliOutput);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isUnsafeCliOutputKey(key))
      .map(([key, entry]) => [key, sanitizeCliOutput(entry)])
  );
}

function isUnsafeCliOutputKey(key: string) {
  const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (SAFE_PAYLOAD_REFERENCE_KEYS.has(normalizedKey)) {
    return false;
  }
  return UNSAFE_CLI_OUTPUT_KEYS.has(normalizedKey) ||
    normalizedKey.includes("credential") ||
    normalizedKey.includes("payload") ||
    normalizedKey.includes("secret") ||
    normalizedKey.endsWith("token") ||
    normalizedKey.endsWith("tokens");
}

export { commands };
