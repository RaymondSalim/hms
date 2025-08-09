import {after, NextResponse} from "next/server";
import * as process from "node:process";
import {getObject} from "@/app/_lib/s3";
import {serverLogger, withAxiom} from "@/app/_lib/axiom/server";

export const GET = withAxiom(async (request: Request, props: { params: Promise<{ s3Path: string[] }> }) => {
    after(() => {
        serverLogger.flush();
    });

    const params = await props.params;
    const fullPath = params.s3Path.join('/');

    let imgObj = await getObject(process.env.S3_BUCKET!, fullPath);
    if (imgObj.success) {
        let imgBuffer = Buffer.concat(imgObj.data);

        return new NextResponse(imgBuffer, {
            status: 200,
            headers: {
                'Content-Type': imgObj.contentType ?? "image/jpg",
                'Content-Length': imgBuffer.length.toString(),
                'Content-Disposition': 'inline',
            }
        });
    }

    if (imgObj.error.name == "NoSuchKey") {
        return new NextResponse("Image not found", {
            status: 404,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    } else {
        serverLogger.error("[s3] error getting object from s3", {error: imgObj.error});
    }

    return new NextResponse("Internal Server Error", {
        status: 500,
        headers: {
            'Content-Type': 'text/plain'
        }
    });
});
