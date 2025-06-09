import {date, number, object, string, union} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

export const maintenanceTaskSchema = object({
  title: string().min(1, "Title is required"),
  description: string().nullable().optional(),
  status: string().optional(),
  due_date: union([isoDateStringToDate(), date()]).optional(),
  room_id: number().optional(),
  location_id: number().min(1, "Location ID is required"),
});

export const maintenanceTaskSchemaWithID = maintenanceTaskSchema.extend({
  id: number().positive("ID must be a positive number"),
});
