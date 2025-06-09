"use server";

import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {maintenanceTaskSchema, maintenanceTaskSchemaWithID} from "@/app/_lib/zod/maintenance/zod";
import {createMaintenanceTask, deleteMaintenanceTask, updateMaintenanceTaskByID, MaintenanceTask, getMaintenanceTasks} from "@/app/_db/maintenance";
import {GenericActionsType} from "@/app/_lib/actions";

export type MaintenanceTaskInclude = MaintenanceTask & {
  rooms?: { id: number; room_number: string } | null;
  locations?: { id: number; name: string } | null;
};

export async function upsertMaintenanceTaskAction(task: Partial<MaintenanceTask>): Promise<GenericActionsType<MaintenanceTaskInclude>> {
  const { success, data, error } = maintenanceTaskSchema.partial({ id: true }).safeParse(task);

  if (!success) {
    return { errors: error?.format() };
  }

  try {
    let res;
    if (data.id) {
      res = await updateMaintenanceTaskByID(data.id, data);
    } else {
      res = await createMaintenanceTask(data);
    }

    return { success: res };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertMaintenanceTaskAction][PrismaKnownError]", error.code, error.message);
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertMaintenanceTaskAction][PrismaUnknownError]", error.message);
    } else {
      console.error("[upsertMaintenanceTaskAction]", error);
    }

    return { failure: "Request unsuccessful" };
  }
}

export async function deleteMaintenanceTaskAction(id: string): Promise<GenericActionsType<MaintenanceTaskInclude>> {
  const parsed = maintenanceTaskSchemaWithID.safeParse({ id: Number(id), title: "" });
  if (!parsed.success) {
    return { errors: parsed.error.format() };
  }
  try {
    const res = await deleteMaintenanceTask(parsed.data.id);
    return { success: res };
  } catch (error) {
    console.error(error);
    return { failure: "Error deleting task" };
  }
}

export async function fetchMaintenanceTasks(locationID?: number) {
  return getMaintenanceTasks(undefined, locationID);
}
