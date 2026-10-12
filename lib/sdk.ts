// Generic Express-compatible typings without needing @types/express installed
interface MinimalRequest {
  url?: string;
  originalUrl?: string;
  method?: string;
  headers?: Record<string, any>;
  [key: string]: any;
}

interface MinimalResponse {
  [key: string]: any;
}

type MinimalNextFunction = (err?: any) => void;

export interface LogLensConfig {
  apiKey: string;
  endpoint?: string;
  environment?: string;
}

/**
 * LogLens Express Error-Handling Middleware
 * Captures unhandled server exceptions and dispatches them asynchronously to LogLens AI.
 */
export function loglensMiddleware(config: LogLensConfig) {
  const endpoint = config.endpoint || "http://localhost:3000/api/v1/logs";

  return (
    err: any,
    req: MinimalRequest,
    _res: MinimalResponse,
    next: MinimalNextFunction,
  ) => {
    // Dispatch error payload asynchronously without blocking the client response cycle
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify({
        level: "error",
        message: err?.message || "Unknown Server Error",
        stack_trace: err?.stack || null,
        context: {
          path: req.originalUrl || req.url || "unknown",
          method: req.method || "UNKNOWN",
          env: config.environment || process.env.NODE_ENV || "production",
        },
      }),
    }).catch((fetchErr) => {
      console.error(
        "[LogLens SDK Client Warning]: Failed to ship error report",
        fetchErr,
      );
    });

    // Pass the error downstream so existing error handlers still execute
    next(err);
  };
}
