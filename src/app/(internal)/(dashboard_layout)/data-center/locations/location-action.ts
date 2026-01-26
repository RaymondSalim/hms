"use server";

import {locationObject, locationObjectWithID, locationObjectWithOptionalID} from "@/app/_lib/zod/locations/zod";
import {number, object, typeToFlattenedError} from "zod";
import {OmitIDTypeAndTimestamp, OmitTimestamp} from "@/app/_db/db";
import {Location} from "@prisma/client";
import {createLocation, deleteLocation, getLocations, updateLocationByID, upsertLocation} from "@/app/_db/location";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export type LocationActionsType<T = OmitIDTypeAndTimestamp<Location>> = {
    success?: Location,
    failure?: string,
    errors?: typeToFlattenedError<T>
}

export async function createLocationAction(prevState: LocationActionsType, formData: FormData): Promise<LocationActionsType> {
    after(() => {
        serverLogger.flush();
    });
    const { success, error, data } = locationObject.safeParse({
        name: formData.get('name'),
        address: formData.get('address'),
    });

    if (!success) {
        return toClient({
            errors: error?.flatten()
        });
    }

    try {
        let res = await createLocation(data);

        return toClient({
            success: res
        });
    } catch (error) {
        serverLogger.error("[createLocationAction]", {error});

        return toClient({
            failure: "error"
        });
    }
}

export async function updateLocationAction(prevState: LocationActionsType, formData: FormData): Promise<LocationActionsType> {
    after(() => {
        serverLogger.flush();
    });
    let { success, error, data } = locationObjectWithID.safeParse({
        id: formData.get('id'),
        name: formData.get('name'),
        address: formData.get('address'),
    });

    if (!success) {
        return toClient({
            errors: error?.flatten()
        });
    }

    try {
        let res = await updateLocationByID(data!.id, {
            ...data,
            // @ts-ignore
            id: undefined
        });

        return toClient({
            success: res
        });
    } catch (error) {
        serverLogger.error("[updateLocationAction]", {error});

        return toClient({
            failure: "error"
        });
    }
}

export async function upsertLocationAction(locationData: OmitTimestamp<Location>): Promise<LocationActionsType> {
    after(() => {
        serverLogger.flush();
    });
    const {success, error, data} = locationObjectWithOptionalID.safeParse(locationData);

    if (!success) {
        return toClient({
            errors: error?.flatten()
        });
    }

    try {
        let res = await upsertLocation(data);

        return toClient({
            success: res
        });
    } catch (error) {
        serverLogger.error("[upsertLocationAction]", {error});

        return toClient({
            failure: "error"
        });
    }
}

export async function deleteLocationAction(id: number): Promise<LocationActionsType<Pick<Location, "id">>> {
    const { success, error, data } = object({ id: number().positive() }).safeParse({
        id: id
    });

    if (!success) {
        return toClient({
            errors: error?.flatten()
        });
    }

    try {
        let res = await deleteLocation(data!.id);

        return toClient({
            success: res
        });
    } catch (error) {
        serverLogger.error("[deleteLocationAction]", {error, location_id: id});

        return toClient({
            failure: "error"
        });
    }
}

export async function getLocationsAction(...args: Parameters<typeof getLocations>) {
    return getLocations(...args).then(toClient);
}
