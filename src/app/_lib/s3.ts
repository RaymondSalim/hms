import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {Readable} from 'stream';
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

const client = new S3Client({region: process.env.AWS_REGION});

export type GetObjectReturnType = {
    success: false,
    error: Error
    data?: never,
    contentType?: never
} | {
    success: true,
    error?: never
    data: Uint8Array[],
    contentType: string
}

export async function getObject(bucket: string, key: string): Promise<GetObjectReturnType> {
    after(() => {
        serverLogger.flush();
    });
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });

    try {
        const response = await client.send(getObjectCommand);

        let responseDataChunks: Uint8Array[] = [];

        if (response.Body instanceof Readable) {
            // Return a promise that resolves with the data chunks
            const dataChunks = await new Promise<Uint8Array[]>((resolve, reject) => {
                const body = response.Body as Readable;
                body.once('error', err => reject(err));
                body.on('data', chunk => responseDataChunks.push(chunk));
                body.once('end', () => resolve(responseDataChunks));
            });

            return {
                success: true,
                data: dataChunks,
                contentType: response.ContentType || ""
            };
        } else {
            throw new Error('Response body is not readable');
        }
    } catch (err) {
        serverLogger.error("Error getting object from S3:", {err});
        return {
            success: false,
            error: err as Error
        };
    }
}

