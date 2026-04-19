/**
 * @typedef {{
 *   id: string,
 *   method: string,
 *   url: string,
 *   headers: Record<string,string>,
 *   omitAuth?: boolean,
 *   family: string,
 *   meta?: {
 *     query?: Record<string, string>,
 *     jsonBody?: unknown,
 *     contentType?: string,
 *     graphql?: { operationKind?: string, fieldName?: string },
 *   },
 * }} FuzzCase
 */

export {};
