import {any, array, boolean, date, number, object, string} from "zod";

const recurrenceSchema = object({
    daysOfWeek: array(number().min(0).max(6)).optional(),
    startRecur: date().optional(),
    endRecur: date().optional(),
    groupId: string().optional(),
    duration: string().optional()
});

export const eventSchema = object({
    title: string({required_error: "Judul harus diisi"}).min(1, "Judul harus diisi"),
    description: string().nullish(),
    start: date({required_error: "Waktu Mulai harus diisi"}),
    end: date({invalid_type_error: "Format Waktu Selesai Salah"}).nullish(),
    allDay: boolean().nullish(),
    backgroundColor: string().min(1).nullish(),
    borderColor: string().min(1).nullish(),
    textColor: string().min(1).nullish(),
    recurring: boolean().nullish(),
    extendedProps: object({
        recurrence: recurrenceSchema.optional()
    }).catchall(any())
});

export const eventSchemaWithOptionalID = eventSchema.extend({
    id: number().positive("ID must be a positive number").optional(),
});
