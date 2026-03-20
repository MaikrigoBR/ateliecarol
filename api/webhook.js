import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        console.log("[WEBHOOK ADMIN SDK] Recebido Payload M.P.:", req.body);
        const { action, data, type } = req.body;

        // O Webhook do MP pode mandar "payment.created" ou "payment.updated"
        let paymentId = req.query.id || req.body?.data?.id;
        
        if (type === 'payment' && data && data.id) {
            paymentId = data.id;
        }

        if (!paymentId) {
             return res.status(200).json({ status: 'Ignorado (Sem ID)' });
        }
        
        const settingsSnap = await db.collection('settings').doc('global').get();
        let accessToken = null;
        if (settingsSnap.exists) accessToken = settingsSnap.data()?.paymentKeys?.accessToken;

        if (!accessToken) return res.status(500).json({ error: 'Token M.P. ausente' });

        // Consulta Mercado Pago API para Detalhes Finais
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!mpRes.ok) return res.status(mpRes.status).json({ error: 'Falha MP Fetch' });
        const mpData = await mpRes.json();
        
        const orderId = mpData.external_reference;
        if (!orderId) return res.status(200).json({ status: 'Ignorado - Sem Reference' });

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        
        if (!orderSnap.exists) return res.status(200).json({ status: 'Pedido não localizado no banco' });
        const order = orderSnap.data();

        // Evitar Duplicação: Verifica Processamento Anterior
        if (order.paymentStatus === 'Recebido' || order.paymentStatus === 'Pago') {
             return res.status(200).json({ status: 'Já processado' });
        }

        // Extrai TODOS os dados financeiros blindados diretamente do Mercado Pago
        const totalOrder = Number(mpData.transaction_amount) || 0;
        const totalTax = mpData.fee_details ? mpData.fee_details.reduce((acc, f) => acc + (f.amount || 0), 0) : 0;
        const netAmount = mpData.transaction_details?.net_received_amount || (totalOrder - totalTax);
        const methodStr = mpData.payment_method_id || 'pix';

        if (mpData.status === 'approved') {
            console.log(`[WEBHOOK ADMIN] Pagamento Aprovado Oficial: #${orderId}`);
            
            // 1. Atualizar Pedido
            await orderRef.update({
                paymentStatus: 'Recebido',
                amountPaid: totalOrder,
                balanceDue: 0,
                status: 'Em Produção',
                paymentDate: new Date().toISOString(),
                gatewayTaxes: totalTax,
                gatewayNet: netAmount,
                gatewayMethodId: methodStr
            });

            // 2. Partida Dobrada Segura (Entrada Financeira Imaculada)
            const transQ = await db.collection('transactions')
                .where('orderId', '==', orderId)
                .where('status', '==', 'paid')
                .get();
            
            if (transQ.empty) {
                await db.collection('transactions').add({
                    type: 'income',
                    description: `Venda E-commerce: Pedido #${String(orderId).substring(0,8)}`,
                    amount: Number(netAmount || totalOrder),
                    date: new Date().toISOString().split('T')[0],
                    category: 'Venda de Produtos',
                    paymentMethod: methodStr === 'pix' ? 'PIX' : 'Cartão de Crédito',
                    status: 'paid',
                    orderId: orderId,
                    accountId: '1',
                    createdAt: new Date().toISOString(),
                    auditData: { gross: totalOrder, tax: totalTax }
                });
            }

            // 3. Notificação do Sistema
            await db.collection('system_notifications').add({
                type: 'PAYMENT_RECEIVED',
                message: `[WEBHOOK] Pagamento Confirmado e Na Produção!`,
                data: orderId,
                timestamp: new Date().toISOString(),
                read: false
            });

        } else if (mpData.status === 'cancelled' || mpData.status === 'rejected' || mpData.status === 'refunded' || mpData.status === 'charged_back') {
             const actionStr = (mpData.status === 'refunded' || mpData.status === 'charged_back') ? 'Estornado Postumamente' : 'Cancelado/Recusado';
             
             await orderRef.update({
                 status: 'Cancelado',
                 cancelDate: new Date().toISOString(),
                 paymentStatus: mpData.status
             });

             // Voltar Estoque se estiver contido lá
             if (order.cartItems && order.cartItems.length > 0) {
                 const productsSnap = await db.collection('products').get();
                 for (const item of order.cartItems) {
                     const productDoc = productsSnap.docs.find(p => String(p.id) === String(item.productId));
                     if (productDoc) {
                         const product = productDoc.data();
                         if (product.stock !== undefined) {
                             await db.collection('products').doc(productDoc.id).update({
                                 stock: product.stock + (Number(item.quantity) || 1)
                             });
                         }
                     }
                 }
             }

             // Lança despesa reversa
             if (mpData.status === 'refunded' || mpData.status === 'charged_back') {
                 await db.collection('transactions').add({
                     type: 'expense',
                     amount: totalOrder, // Usa o total devolvido pelo MP
                     description: `[AUTO-ESTORNO M.P.] Pedido #${String(orderId).substring(0,8)}`,
                     category: 'Estornos e Devoluções',
                     date: new Date().toISOString().split('T')[0],
                     status: 'paid',
                     orderId: orderId,
                     accountId: '1',
                     createdAt: new Date().toISOString()
                 });
             }
        }
        
        return res.status(200).json({ success: true, processedStatus: mpData.status });

    } catch (err) {
        console.error("[WEBHOOK ERROR]:", err);
        return res.status(500).json({ error: err.message });
    }
}
