import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    // Inject CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Idempotency-Key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed. This is a secure endpoint.' });
    }

    try {
        const body = req.body;
        const settingsSnap = await db.collection('settings').doc('global').get();
        let accessToken = null;
        if (settingsSnap.exists) {
            const data = settingsSnap.data();
            accessToken = data?.paymentKeys?.accessToken;
        }

        if (!accessToken) {
             return res.status(500).json({ status: 'error', message: 'Token de Acesso do Mercado Pago não encontrado. Adicione na aba Configurações > Loja Virtual.' });
        }

        const idempotencyKey = req.headers['x-idempotency-key'] || body.idempotency_key || crypto.randomUUID();

        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(body.paymentPayload)
        });

        const mpData = await mpRes.json();

        if (mpRes.ok) {
            return res.status(200).json(mpData);
        } else {
            console.error("MP Rejeitou pagamento API Pay:", mpData);
            return res.status(mpRes.status).json({ status: 'error', message: mpData.message || 'Falha ao processar pagamento no Mercado Pago.', details: mpData });
        }

    } catch (err) {
        console.error("[SECURE API] Error creating payment: ", err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
}
