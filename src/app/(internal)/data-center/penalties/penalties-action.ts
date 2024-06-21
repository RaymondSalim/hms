import { Penalty, Prisma } from "@prisma/client";
import { OmitIDTypeAndTimestamp } from "@/app/_db/db";
import { createPenalty, deletePenalty, updatePenaltyByID } from "@/app/_db/penalty";
import { number, object } from "zod";
import {penaltySchemaWithID, penaltySchema} from "@/app/_lib/zod/penalties/zod";

export type PenaltyActionsType<T = OmitIDTypeAndTimestamp<Penalty>> = {
  success?: string | Penalty;
  failure?: string;
  errors?: Partial<Penalty>;
};

export async function createPenaltyAction(prevState: PenaltyActionsType, formData: FormData): Promise<PenaltyActionsType> {
  const parsedData = penaltySchema.safeParse({
    amount: parseFloat(formData.get("amount") as string),
    description: formData.get("description"),
    booking_id: formData.get("booking_id") ? parseInt(formData.get("booking_id") as string) : undefined,
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await createPenalty({
      ...parsedData.data,
      booking_id: parsedData.data.booking_id ?? null,
      amount: new Prisma.Decimal(parsedData.data.amount)
    });

    return {
      success: res,
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "Error creating penalty",
    };
  }
}

export async function updatePenaltyAction(prevState: PenaltyActionsType, formData: FormData): Promise<PenaltyActionsType> {
  const parsedData = penaltySchemaWithID.safeParse({
    id: parseInt(formData.get("id") as string),
    amount: parseFloat(formData.get("amount") as string),
    description: formData.get("description"),
    booking_id: formData.get("booking_id") ? parseInt(formData.get("booking_id") as string) : undefined,
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await updatePenaltyByID(parsedData.data.id, {
      ...parsedData.data,
      booking_id: parsedData.data.booking_id ?? null,
      amount: new Prisma.Decimal(parsedData.data.amount)
    });

    return {
      success: res,
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "Error updating penalty",
    };
  }
}

export async function deletePenaltyAction(prevState: PenaltyActionsType<Pick<Penalty, "id">>, formData: FormData): Promise<PenaltyActionsType<Pick<Penalty, "id">>> {
  const parsedData = object({ id: number().positive() }).safeParse({
    id: parseInt(formData.get("id") as string),
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await deletePenalty(parsedData.data.id);

    return {
      success: res,
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "Error deleting penalty",
    };
  }
}
