import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    // Inject CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }

    try {
        const { paymentId, orderId } = req.query;
        if (!paymentId && !orderId) {
            return res.status(400).json({ error: 'paymentId or orderId is required' });
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        let accessToken = null;
        if (settingsSnap.exists) {
            const data = settingsSnap.data();
            accessToken = data?.paymentKeys?.accessToken;
        }

        if (!accessToken) {
             return res.status(500).json({ error: 'Token de Acesso do Mercado Pago não encontrado no banco de dados.' });
        }

        let mpUrl = '';
        if (orderId) {
            mpUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`;
        } else {
            mpUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
        }

        const mpRes = await fetch(mpUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!mpRes.ok) {
             return res.status(mpRes.status).json({ error: 'Erro ao consultar Mercado Pago' });
        }
        
        let mpData = await mpRes.json();
        
        // Se for busca por external_reference, pega o último pagamento gerado
        if (orderId && mpData.results) {
            if (mpData.results.length > 0) {
                // Ordena pelo latest
                mpData.results.sort((a,b) => new Date(b.date_created) - new Date(a.date_created));
                mpData = mpData.results[0]; // Pega o principal/mais recente
            } else {
                return res.status(200).json({ status: 'pending', error: 'No transaction found yet' });
            }
        }

        return res.status(200).json({
            id: mpData.id,
            status: mpData.status,
            status_detail: mpData.status_detail,
            transaction_amount: mpData.transaction_amount,
            date_approved: mpData.date_approved,
            fee_details: mpData.fee_details || [],
            transaction_details: mpData.transaction_details || {},
            payment_method_id: mpData.payment_method_id,
            payment_type_id: mpData.payment_type_id
        });

    } catch (err) {
        console.error("[SECURE API] Error checking payment: ", err);
        return res.status(500).json({ error: err.message });
    }
}
