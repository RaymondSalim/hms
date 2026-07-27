import type {Formatter} from '@axiomhq/logging';
import {getRequestId} from '@/app/_lib/request-context';

export const addStaticFields: Formatter = (rec) => ({
    ...rec,
    fields: {
        ...rec.fields,
        host: process.env.VERCEL_URL,
        vercel_deployment_id: process.env.VERCEL_DEPLOYMENT_ID,
    },
});

export const addRequestId: Formatter = (rec) => {
    const requestId = getRequestId();
    if (!requestId) return rec;
    return {
        ...rec,
        fields: {
            ...rec.fields,
            requestId,
        },
    };
};
