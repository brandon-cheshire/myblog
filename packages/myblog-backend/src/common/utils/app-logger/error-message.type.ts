export type ErrorMessageType =
  | { message: string; error: unknown }
  | { message: string }
  | { error: unknown };
