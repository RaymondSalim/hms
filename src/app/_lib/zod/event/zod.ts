import {array, boolean, date, number, object, string} from "zod";

const recurrenceSchema = object({
    daysOfWeek: array(number().min(0).max(6)).optional(),
    startRecur: string().optional(),
    endRecur: string().optional(),
    groupId: string().optional(),
    duration: string().optional()
});

export const eventSchema = object({
    title: string({required_error: "Judul harus diisi"}).min(1, "Judul harus diisi"),
    description: string().nullish(),
    start: date({required_error: "Waktu Mulai harus diisi"}),
    end: date().nullish(),
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
