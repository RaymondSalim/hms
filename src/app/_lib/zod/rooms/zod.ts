import {Prisma} from "@prisma/client";
import {any, array, number, object, preprocess, record, string, z, ZodIssueCode} from "zod";

export const roomSchema = object({
  room_number: string({required_error: "Room Number is required"}),
  roomstatuses: object({
    id: number({required_error: "Status ID is required"})
  }),
  location_id: number({required_error: "Location ID is required"}),
});

export const roomSchemaWithOptionalID = roomSchema.extend({
  id: number().positive().optional()
});

export const roomWithType = roomSchemaWithOptionalID.extend({
  roomtypes: object({
    id: number({required_error: "Room Type ID is required"}),
    roomtypedurations: array(
      object({
        id: number().min(1, "ID should be positive").optional(),
        room_type_id: number({required_error: "Room Type ID is required"}),
        duration_id: number().min(1, "Duration ID should be greater than zero").optional(),
        location_id: number().min(1, "Location ID should be greater than zero"),
        durations: record(string(), any()).optional(),
        suggested_price: preprocess(
          (val) => {
            if (typeof val == "string") {
              return Number(val);
            }

            return val;
          },
          number({required_error: "Suggested Price is required"})
            .min(1, "Suggested Price should be greater than 0").optional()
        ),
      })
    )
  })
})
  .superRefine((input, ctx) => {
    input.roomtypes.roomtypedurations.forEach(rtd => {
      if (rtd) {
        if (rtd.duration_id == undefined && !rtd.durations) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message: "Either Duration ID or duration object should be set",
            fatal: true,
          });

          return z.NEVER;
        }


        // @ts-ignore
        rtd.suggested_price = new Prisma.Decimal(rtd.suggested_price);
      }
    });
  });
