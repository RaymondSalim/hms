import {typeToFlattenedError} from "zod";

export type GenericActionsType<T> = {
  success?: T | null,
  failure?: string,
  errors?: typeToFlattenedError<T>
}
