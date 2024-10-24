"use server";

import {Tenant} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {object, string} from "zod";
import {createTenant, deleteTenant, TenantWithRooms, updateTenantByID} from "@/app/_db/tenant";
import {tenantSchemaWithOptionalID} from "@/app/_lib/zod/tenant/zod";

// Action to update tenants
export async function upsertTenantAction(tenantData: Partial<Tenant>): Promise<GenericActionsType<TenantWithRooms>> {
  const {success, data, error} = tenantSchemaWithOptionalID.safeParse(tenantData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  try {
    let res;
    // Update
    if (data?.id) {
      res = await updateTenantByID(data.id, data);
    } else {
      res = await createTenant(data);
    }

    return {
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[register]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Alamat email sudah terdaftar"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[register]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteTenantAction(id: string): Promise<GenericActionsType<TenantWithRooms>> {
  const parsedData = object({id: string().min(1, "ID is required")}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.format()
    };
  }

  try {
    let res = await deleteTenant(parsedData.data.id);
    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error deleting tenant",
    };
  }
}
