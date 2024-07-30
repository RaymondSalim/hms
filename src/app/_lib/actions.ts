import {ZodFormattedError} from "zod";

export type GenericActionsType<T> = {
  success?: T | null,
  failure?: string,
  errors?: ZodFormattedError<T>
}
