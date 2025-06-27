// app/routes/auth/callback.jsx
import { authenticate } from '~/shopify.server';

export const loader = async ({ request }) => {
    return await authenticate.shopify.callback(request);
};
