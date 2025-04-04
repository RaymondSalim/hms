import {object, string, ZodIssueCode} from "zod";

export const baseTenantSchema = object({
    name: string({
        required_error: "Nama harus diisi"
    }).min(3, "Nama harus diisi"),
    id_number: string({
        required_error: "Nomor identitas harus diisi"
    }).min(5, "Nomor identitas harus diisi"),
    email: string({
        required_error: "Email harus diisi"
    }).email("Alamat email tidak valid").nullish().transform((val) => (val == undefined) ? null : val),
    phone: string({
        required_error: "Nomor telepon harus diisi"
    }).nullish().transform((val) => (val == undefined) ? null : val),
    current_address: string({
        required_error: "Alamat harus diisi"
    }).min(5, "Alamat harus diisi").nullish().transform((val) => (val == undefined) ? null : val),
    emergency_contact_name: string({
        required_error: "Nama kontak darurat harus diisi"
    }).min(3, "Nama kontak darurat harus diisi").nullish().transform((val) => (val == undefined) ? null : val),
    emergency_contact_phone: string({
        required_error: "Nomor telepon kontak darurat harus diisi"
    }).min(5, "Nomor telepon kontak darurat harus diisi").nullish().transform((val) => (val == undefined) ? null : val),
    referral_source: string().nullish().transform((val) => (val == undefined) ? null : val),
    
    second_resident_id: string().nullish().transform((val) => (val == undefined) ? null : val),
    second_resident_relation: string().nullish().transform((val) => (val == undefined) ? null : val),
    second_resident_name: string({
        required_error: "Nama harus diisi"
    }).min(3, "Nama harus diisi").nullish(),
    second_resident_id_number: string({
        required_error: "Nomor identitas harus diisi"
    }).min(5, "Nomor identitas harus diisi").nullish(),
    second_resident_email: string({
        required_error: "Email harus diisi"
    }).email("Alamat email tidak valid").nullish().transform((val) => (val == undefined) ? null : val),
    second_resident_phone: string({
        required_error: "Nomor telepon harus diisi"
    }).nullish().transform((val) => (val == undefined) ? null : val),

    id_file: string().nullish(),
    family_certificate_file: string().nullish(),
    second_resident_id_file: string().nullish(),

    id_file_data: object({
        fileName: string(),
        fileType: string(),
        b64File: string().superRefine((b64Str, ctx) => {
            // Decode the base64 string to get the binary data
            const matches = b64Str.match(/^data:(.*);base64,(.*)$/);
            if (!matches || matches.length < 3) {
                ctx.addIssue({
                    code: ZodIssueCode.custom,
                    path: ["id_file_data", "b64File"],
                    message: "Gambar tidak valid"
                });
            }
        })
    }).nullish().transform((val) => (val == undefined) ? null : val),
    family_certificate_file_data: object({
        fileName: string(),
        fileType: string(),
        b64File: string().superRefine((b64Str, ctx) => {
            // Decode the base64 string to get the binary data
            const matches = b64Str.match(/^data:(.*);base64,(.*)$/);
            if (!matches || matches.length < 3) {
                ctx.addIssue({
                    code: ZodIssueCode.custom,
                    path: ["family_certificate_file_data", "b64File"],
                    message: "Gambar tidak valid"
                });
            }
        })
    }).nullish().transform((val) => (val == undefined) ? null : val),
    second_resident_id_file_data: object({
        fileName: string(),
        fileType: string(),
        b64File: string().superRefine((b64Str, ctx) => {
            // Decode the base64 string to get the binary data
            const matches = b64Str.match(/^data:(.*);base64,(.*)$/);
            if (!matches || matches.length < 3) {
                ctx.addIssue({
                    code: ZodIssueCode.custom,
                    path: ["second_resident_id_file_data", "b64File"],
                    message: "Gambar tidak valid"
                });
            }
        })
    }).nullish().transform((val) => (val == undefined) ? null : val),
});

export const tenantSchema = baseTenantSchema.refine((data) => {
    return !(data.second_resident_id && !data.second_resident_relation);
}, {
    message: "Hubungan dengan penghuni kedua harus diisi",
    path: ["second_resident_relation"]
});

export const tenantSchemaWithOptionalID = baseTenantSchema.extend({
    id: string().min(1, "ID is required").optional(),
})
    .superRefine((data, ctx) => {
        const secondResidentFields = [
            ["second_resident_name", "Nama Penghuni Kedua"],
            ["second_resident_relation", "Hubungan"],
            ["second_resident_id_number", "Nomor ID Penghuni Kedua"],
            ["second_resident_id_file", "File ID Penghuni Kedua"],
            ["second_resident_phone", "Nomor Telepon Penghuni Kedua"],
            ["second_resident_email", "Email Penghuni Kedua"],
        ];

        // @ts-expect-error accessing object with string
        const isSecondResidentSet = secondResidentFields.some(field => Boolean(data[field[1]]));

        if (isSecondResidentSet) {
            // Ensure all required `second_resident_*` fields are set
            secondResidentFields.forEach(field => {
                // @ts-expect-error accessing object with string
                if (!data[field[1]]) {
                    ctx.addIssue({
                        code: "custom",
                        message: `'${field[1]}' harus diisi jika salah satu field penghuni kedua diisi.`,
                        path: [field[0]],
                    });
                }
            });

            // Additional check for family_certificate_file
            if (!data.family_certificate_file && !data.family_certificate_file_data) {
                ctx.addIssue({
                    code: "custom",
                    message: "Kartu Keluarga Harus Diisi",
                    path: ["family_certificate_file_data"],
                });
            }
        }

        if (data.emergency_contact_name && !data.emergency_contact_phone) {
            ctx.addIssue({
                code: ZodIssueCode.custom,
                message: "Nomor telepon kontak darurat harus diisi",
                path: ["emergency_contact_phone"]
            });
        }
    });
