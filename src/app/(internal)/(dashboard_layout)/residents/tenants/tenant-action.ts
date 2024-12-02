"use server";

import {Tenant} from "@prisma/client";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {object, string} from "zod";
import {
    createTenant,
    deleteTenant,
    TenantWithRooms,
    TenantWithRoomsAndSecondResident,
    updateTenantByID
} from "@/app/_db/tenant";
import {tenantSchemaWithOptionalID} from "@/app/_lib/zod/tenant/zod";
import {DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {OmitTimestamp, PartialBy} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

// Action to update tenants
export async function upsertTenantAction(tenantData: Partial<Tenant>): Promise<GenericActionsType<TenantWithRoomsAndSecondResident>> {
    const {success, data, error} = tenantSchemaWithOptionalID.safeParse(tenantData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }
    const client = new S3Client({region: process.env.AWS_REGION});

    const idFile = data?.id_file_data;
    let idS3Key: string | undefined = undefined;
    try {
        if (idFile) {
            const b64Str = idFile.b64File.split(',')[1];
            const buffer = Buffer.from(b64Str, 'base64');

            // Upload file to s3 first
            if (buffer) {
                const key = `tenants/id/${new Date().toISOString()}/${data?.name}_${idFile.fileName}`;
                const command = new PutObjectCommand({
                    Body: buffer,
                    Bucket: process.env.S3_BUCKET,
                    Key: key
                });
                await client.send(command);
                idS3Key = key;
            }
        }
    } catch (error) {
        console.warn("[upsertTenantAction] error uploading to s3 with err: ", error);
        return {
            failure: "Internal Server Error"
        };
    }

    const familyCertificateFile = data?.family_certificate_file_data;
    let familyCertificateS3Key: string | undefined = undefined;
    try {
        if (familyCertificateFile) {
            const b64Str = familyCertificateFile.b64File.split(',')[1];
            const buffer = Buffer.from(b64Str, 'base64');

            // Upload file to s3 first
            if (buffer) {
                const key = `tenants/family-certificate/${new Date().toISOString()}/${familyCertificateFile.fileName}`;
                const command = new PutObjectCommand({
                    Body: buffer,
                    Bucket: process.env.S3_BUCKET,
                    Key: key
                });
                await client.send(command);
                familyCertificateS3Key = key;
            }
        }
    } catch (error) {
        console.warn("[upsertTenantAction] error uploading to s3 with err: ", error);
        // Delete previously uploaded ID
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: idS3Key
            });
            await client.send(command);
        } catch (error) {
            console.warn("[upsertTenantAction] error deleting from s3 with err: ", error);
        }
        return {
            failure: "Internal Server Error"
        };
    }

    const secondTenantIDFile = data?.second_resident_id_file_data;
    let secondTenantIDS3Key: string | undefined = undefined;
    try {
        if (secondTenantIDFile) {
            const b64Str = secondTenantIDFile.b64File.split(',')[1];
            const buffer = Buffer.from(b64Str, 'base64');

            // Upload file to s3 first
            if (buffer) {
                const key = `tenants/id/${new Date().toISOString()}/${data?.second_resident_name}_${secondTenantIDFile.fileName}`;
                const command = new PutObjectCommand({
                    Body: buffer,
                    Bucket: process.env.S3_BUCKET,
                    Key: key
                });
                await client.send(command);
                secondTenantIDS3Key = key;
            }
        }
    } catch (error) {
        console.warn("[upsertTenantAction] error uploading to s3 with err: ", error);
        // Delete previously uploaded ID
        try {
            const command = new DeleteObjectsCommand({
                Bucket: process.env.S3_BUCKET,
                Delete: {
                    Objects: [
                        {
                            Key: idS3Key,
                        },
                        {
                            Key: familyCertificateS3Key,
                        }
                    ],
                }
            });

            await client.send(command);
        } catch (error) {
            console.warn("[upsertTenantAction] error deleting from s3 with err: ", error);
        }
        return {
            failure: "Internal Server Error"
        };
    }

    let newTenantData: PartialBy<OmitTimestamp<Tenant>, "id"> = {
        id: data?.id,
        id_number: data?.id_number,
        name: data?.name,
        email: data?.email,
        phone: data?.phone,
        current_address: data?.current_address,
        emergency_contact_name: data?.emergency_contact_name,
        emergency_contact_phone: data?.emergency_contact_phone,
        referral_source: data?.referral_source,

        second_resident_id: data?.second_resident_id,
        second_resident_relation: data?.second_resident_relation,
        second_resident_id_number: data?.second_resident_id_number ?? null,
        second_resident_name: data?.second_resident_name ?? null,
        second_resident_email: data?.second_resident_email,
        second_resident_phone: data?.second_resident_phone,

        id_file: idS3Key ?? data?.id_file ?? null,
        family_certificate_file: familyCertificateS3Key ?? data?.family_certificate_file ?? null,
        second_resident_id_file: secondTenantIDS3Key ?? data?.second_resident_id_file ?? null,
    };

    try {
        let res;
        // Update
        await prisma.$transaction(async (tx) => {
            if (data?.id) {
                res = await updateTenantByID(data.id, newTenantData, tx);
            } else {
                res = await createTenant(newTenantData, tx);
            }
        });

        return {
            success: res
        };
    } catch (error) {
        // Delete S3 objects
        try {
            const command = new DeleteObjectsCommand({
                Bucket: process.env.S3_BUCKET,
                Delete: {
                    Objects: [
                        { Key: idS3Key },
                        { Key: familyCertificateS3Key },
                        { Key: secondTenantIDS3Key }
                    ]
                }
            });
            await client.send(command);
        } catch (error) {
            console.warn("[upsertTenantAction] error deleting multiple objects from s3 with err: ", error);
        }

        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[register]", error.code, error.message);
            if (error.code == "P2002") {
                return {failure: "Alamat email sudah terdaftar"};
            }
        }
        if (error instanceof Error) {
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
