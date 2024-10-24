import {Prisma} from "@prisma/client";
import {any, array, number, object, preprocess, record, string, z, ZodIssueCode} from "zod";

export const roomSchema = object({
  room_number: string({required_error: "Nomor kamar diperlukan"}),
  roomstatuses: object({
    id: number({required_error: "ID Status diperlukan"})
  }, {required_error: "ID Status diperlukan"}),
  location_id: number({required_error: "ID lokasi diperlukan"}),
});

export const roomSchemaWithOptionalID = roomSchema.extend({
  id: number().positive().optional()
});

export const roomWithType = roomSchemaWithOptionalID.extend({
  roomtypes: object({
    id: number({required_error: "ID Tipe Kamar diperlukan"}),
    roomtypedurations: array(
      object({
        id: number().min(1, "ID harus positif").optional(),
        room_type_id: number({required_error: "ID Tipe Kamar diperlukan"}),
        duration_id: number().min(1, "ID durasi harus lebih besar daripada 0").optional(),
        location_id: number().min(1, "ID lokasi harus lebih besar daripada 0"),
        durations: record(string(), any()).optional(),
        suggested_price: preprocess(
          (val) => {
            if (val == undefined) {
              return undefined;
            }

            if (typeof val == "string") {
              return Number(val);
            }

            return val;
          },
          number({required_error: "Harga Yang Disarankan diperlukan"})
            .min(1, "Harga Yang Disarankan harus lebih besar daripada 0").optional()
        ),
      })
    )
  })
})
  .superRefine((input, ctx) => {
    input.roomtypes.roomtypedurations.forEach((rtd, index) => {
      if (rtd) {
        if (rtd.duration_id == undefined && !rtd.durations) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message: "Antara ID durasi atau object durasi diperlukan",
            fatal: true,
          });

          return z.NEVER;
        }

        if (rtd.suggested_price) {
          // @ts-ignore
          rtd.suggested_price = new Prisma.Decimal(rtd.suggested_price);
        }
      }
    });
  })
  .transform(arg => {
    arg.roomtypes.roomtypedurations.forEach((value, index) => {
      if (value.suggested_price == undefined) {
        arg.roomtypes.roomtypedurations.splice(index, 1);
      }
    });

    return arg;
  });
