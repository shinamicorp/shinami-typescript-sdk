import { Infer, coerce, integer, object, string } from "superstruct";

export const AddRequest = object({
  x: integer(),
  y: integer(),
});
export type AddRequest = Infer<typeof AddRequest>;

export const AddResult = object({
  result: coerce(integer(), string(), (value) => parseInt(value)),
});
export type AddResult = Infer<typeof AddResult>;

export const AddResponse = object({
  ...AddResult.schema,
  txDigest: string(),
});
export type AddResponse = Infer<typeof AddResponse>;
