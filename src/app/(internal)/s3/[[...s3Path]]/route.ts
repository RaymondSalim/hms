import {NextResponse} from "next/server";
import * as process from "node:process";
import {getObject} from "@/app/_lib/s3";

export async function GET(request: Request, { params }: { params: { s3Path: string[] } }) {
    const fullPath = params.s3Path.join('/');

    try {
        let imgObj = await getObject(process.env.S3_BUCKET!, fullPath)
        let imgBuffer = Buffer.concat(imgObj.data)

        return new NextResponse(imgBuffer, {
            status: 200,
            headers: {
                'Content-Type': imgObj.contentType ?? "image/jpg",
                'Content-Length': imgBuffer.length.toString(),
                'Content-Disposition': 'inline',
            }
        });
    } catch (e) {
        console.log("error getting object from s3", e);
    }

    return new NextResponse("Internal Server Error", {
        status: 500,
    })
}