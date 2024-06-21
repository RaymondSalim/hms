import {guestSchema, guestSchemaWithID} from "@/app/_lib/zod/guests/zod";
import {Guest} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {number, object} from "zod";
import {createGuest, deleteGuest, updateGuestByID} from "@/app/_db/guest";

export type GuestActionsType<T = OmitIDTypeAndTimestamp<Guest>> = {
  success?: string | Guest;
  failure?: string;
  errors?: Partial<Guest>;
};

export async function createGuestAction(prevState: GuestActionsType, formData: FormData): Promise<GuestActionsType> {
  const parsedData = guestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await createGuest({
      ...parsedData.data,
      email: parsedData.data.email ?? null,
      phone: parsedData.data.phone ?? null,
    });
    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error creating guest",
    };
  }
}

export async function updateGuestAction(prevState: GuestActionsType, formData: FormData): Promise<GuestActionsType> {
  const parsedData = guestSchemaWithID.safeParse({
    id: parseInt(formData.get("id") as string),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await updateGuestByID(parsedData.data.id, {
      ...parsedData.data,
      email: parsedData.data.email ?? null,
      phone: parsedData.data.phone ?? null,
    });
    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error updating guest",
    };
  }
}

export async function deleteGuestAction(prevState: GuestActionsType<Pick<Guest, "id">>, formData: FormData): Promise<GuestActionsType<Pick<Guest, "id">>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: parseInt(formData.get("id") as string),
  });

  if (!parsedData.success) {
    return {
      errors: Object.fromEntries(parsedData.error.errors.entries()),
    };
  }

  try {
    let res = await deleteGuest(parsedData.data.id);
    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error deleting guest",
    };
  }
}
