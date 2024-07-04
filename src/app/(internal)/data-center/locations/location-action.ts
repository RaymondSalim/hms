"use server";

import {locationObject, locationObjectWithID, locationObjectWithOptionalID} from "@/app/_lib/zod/locations/zod";
import {number, object, typeToFlattenedError} from "zod";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Location} from "@prisma/client";
import {createLocation, deleteLocation, updateLocationByID, upsertLocation} from "@/app/_db/location";

export type LocationActionsType<T = OmitIDTypeAndTimestamp<Location>> = {
  success?: Location,
  failure?: string,
  errors?: typeToFlattenedError<T>
}

export async function createLocationAction(prevState: LocationActionsType, formData: FormData): Promise<LocationActionsType> {
  const { success, error, data } = locationObject.safeParse({
    name: formData.get('name'),
    address: formData.get('address'),
  });

  if (!success) {
    return {
      errors: error?.flatten()
    };
  }

  try {
    let res = await createLocation(data);

    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}

export async function updateLocationAction(prevState: LocationActionsType, formData: FormData): Promise<LocationActionsType> {
  let { success, error, data } = locationObjectWithID.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    address: formData.get('address'),
  });

  if (!success) {
    return {
      errors: error?.flatten()
    };
  }

  try {
    let res = await updateLocationByID(data!.id, {
      ...data,
      // @ts-ignore
      id: undefined
    });

    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}

export async function upsertLocationAction(locationData: Partial<Location>): Promise<LocationActionsType> {
  const {success, error, data} = locationObjectWithOptionalID.safeParse(locationData);

  if (!success) {
    return {
      errors: error?.flatten()
    };
  }

  try {
    let res = await upsertLocation(data);

    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}

export async function deleteLocationAction(id: number): Promise<LocationActionsType<Pick<Location, "id">>> {
  const { success, error, data } = object({ id: number().positive() }).safeParse({
    id: id
  });

  if (!success) {
    return {
      errors: error?.flatten()
    };
  }

  try {
    let res = await deleteLocation(data!.id);

    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}
