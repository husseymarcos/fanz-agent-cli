import type { parseCommand } from "./parser";

export type Command = ReturnType<typeof parseCommand>;
