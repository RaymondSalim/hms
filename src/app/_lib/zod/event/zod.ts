import {array, boolean, date, number, object, string, union} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

const recurrenceSchema = object({
    daysOfWeek: array(number().min(0).max(6)).optional(),
    startRecur: string().optional(),
    startTime: string().optional(),
    endRecur: string().optional(),
    endTime: string().optional(),
    groupId: string().optional(),
    duration: string().optional()
});

export const eventSchema = object({
    title: string({required_error: "Judul harus diisi"}).min(1, "Judul harus diisi"),
    description: string().nullish(),
    start: union([isoDateStringToDate({required_error: "Waktu mulai harus diisi"}), date({required_error: "Waktu mulai harus diisi"})]),
    end: union([isoDateStringToDate(), date()]).nullish(),
    allDay: boolean().default(false),
    backgroundColor: string().nullish(),
    borderColor: string().nullish(),
    textColor: string().nullish(),
    recurring: boolean().default(false),
    extendedProps: object({
        recurrence: recurrenceSchema.optional()
    }).nullish()
});

export const eventSchemaWithOptionalID = eventSchema.extend({
    id: number().positive("ID must be a positive number").optional(),
});
