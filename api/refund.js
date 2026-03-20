import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }

    try {
        const { paymentId, amount } = req.body;
        if (!paymentId) return res.status(400).json({ error: 'paymentId is required' });

        const settingsSnap = await db.collection('settings').doc('global').get();
        
        let accessToken = null;
        if (settingsSnap.exists) {
            accessToken = settingsSnap.data()?.paymentKeys?.accessToken;
        }

        if (!accessToken) return res.status(500).json({ error: 'Token M.P. não configurado' });

        // Chama a API de Refund do Mercado Pago
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `REFUND-${paymentId}-${Date.now()}`
            },
            body: amount ? JSON.stringify({ amount: Number(amount) }) : '{}' // Estorno Total se null
        });

        const mpData = await mpRes.json();
        
        if (!mpRes.ok) {
             return res.status(mpRes.status).json({ error: 'Erro ao estornar no Mercado Pago', details: mpData });
        }

        return res.status(200).json({
            success: true,
            refund_id: mpData.id,
            status: mpData.status,
            amount_refunded: mpData.amount
        });

    } catch (err) {
        console.error("[SECURE API] Error refunding: ", err);
        return res.status(500).json({ error: err.message });
    }
}
