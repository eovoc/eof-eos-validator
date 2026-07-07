declare module "stac-node-validator" {
  export interface StacValidationError {
    instancePath?: string;
    message?: string;
    [key: string]: unknown;
  }

  export interface StacValidationResults {
    core: StacValidationError[];
    extensions: Record<string, StacValidationError[]>;
    custom: StacValidationError[];
  }

  export interface StacValidationReport {
    id: string | null;
    type: string | null;
    version: string | null;
    valid: boolean | null;
    skipped: boolean;
    messages: string[];
    children: StacValidationReport[];
    results: StacValidationResults;
    apiList: boolean;
    source: string | null;
  }

  export interface StacValidatorConfig {
    loader?: (data: unknown) => Promise<unknown>;
    schemas?: string | null;
    schemaMap?: Record<string, string>;
    strict?: boolean;
    verbose?: boolean;
  }

  export default function validate(
    data: unknown,
    config?: StacValidatorConfig
  ): Promise<StacValidationReport>;
}
