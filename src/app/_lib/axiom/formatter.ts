import type {Formatter} from '@axiomhq/logging';

export const addStaticFields: Formatter = (rec) => ({
    ...rec,
    fields: {
        ...rec.fields,
        host: process.env.VERCEL_URL,
        vercel_deployment_id: process.env.VERCEL_DEPLOYMENT_ID,
    },
});
