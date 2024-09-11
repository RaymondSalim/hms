import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import { Readable } from 'stream';

const client = new S3Client({region: process.env.AWS_REGION});

export function getObject(bucket: string, key: string): Promise<{
    data: Uint8Array[],
    contentType?: string
}> {
    return new Promise(async (resolve, reject) => {
        const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key })

        try {
            const response = await client.send(getObjectCommand)

            let responseDataChunks: Uint8Array[] = []

            if (response.Body instanceof Readable) {
                response.Body.once('error', err => reject(err))

                response.Body.on('data', chunk => responseDataChunks.push(chunk))

                response.Body.once('end', () => resolve({
                    data: responseDataChunks,
                    contentType: response.ContentType
                }))
            }
        } catch (err) {
            console.error("error getObject from s3:", err)
            throw err
        }
    })
}
