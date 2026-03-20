import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); 

    if (req.method !== 'GET') {
        return res.status(405).json({ status: 'error', message: 'Use GET request com ?id=SEU_PEDIDO' });
    }

    try {
        const orderId = req.query.id;
        if (!orderId) {
            return res.status(400).send(`
                <html><body>
                <h3>Diagnóstico de Caixa Preta (M.P. Direto)</h3>
                <p>Por favor adicione ?id=CODIGO_DO_PEDIDO na URL.</p>
                <p>Exemplo: <b>/api/diagnose_payment?id=5aOHjPxo</b></p>
                </body></html>
            `);
        }

        let accessToken = null;
        try {
            const settingsSnap = await db.collection('settings').doc('global').get();
            accessToken = settingsSnap.data()?.paymentKeys?.accessToken;
        } catch(e) {
            return res.status(500).json({ step: 'firebase_admin_read', error: e.message });
        }

        if (!accessToken) return res.status(500).json({ error: 'Nenhum token configurado.' });

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const mpData = await mpRes.json();
        
        let dbOrder = { _error: "Erro desconhecido" };
        try {
            const dbSnap = await db.collection('orders').doc(orderId).get();
            dbOrder = dbSnap.exists ? dbSnap.data() : { _error: "Pedido não localizado" };
        } catch(e) {
            console.log("Erro de leitura SDK:", e.message);
        }

        return res.status(200).send(`
            <html>
            <body style="font-family: monospace; background: #0f172a; color: #10b981; padding: 20px;">
                <h2>⚙️ Scanner de Auditoria Firebase Admin (Acesso Nível Deus)</h2>
                <hr style="border-color: #334155;"/>
                <h3>1. Status Atual no Firebase (Bypass de Security Rules Confirmado)</h3>
                <pre style="color: #60a5fa">${JSON.stringify({ 
                    status: dbOrder.status, 
                    paymentStatus: dbOrder.paymentStatus, 
                    mpPaymentId: dbOrder.mpPaymentId 
                }, null, 2)}</pre>
                
                <h3>2. Resposta Bruta do Servidor do Mercado Pago</h3>
                <pre style="color: #cbd5e1">${JSON.stringify(mpData.results && mpData.results.length > 0 ? mpData.results[0] : mpData, null, 2)}</pre>
            </body>
            </html>
        `);

    } catch (err) {
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
}
