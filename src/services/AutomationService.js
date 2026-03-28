
import db from '../services/database';

/**
 * AutomationService
 * 
 * Simula "Cloud Functions" rodando no cliente.
 * Detecta condições de negócio (estoque baixo, pedidos atrasados) e gera alertas/notificações.
 * 
 * Features:
 * - Monitoramento de Estoque
 * - Monitoramento de Prazos
 * - Fechamento Diário (Logs)
 */

class AutomationService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.lastCheck = localStorage.getItem('last_automation_check');
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🦾 AutomationService: Iniciando tarefas de fundo...");
        
        // Rodar imediatamente na inicialização
        this.runChecks();

        // Agendar para rodar a cada 5 minutos
        this.interval = setInterval(() => this.runChecks(), 5 * 60 * 1000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.isRunning = false;
    }

    async runChecks() {
        try {
            console.log("🦾 AutomationService: Executando verificações...");
            
            // 1. Estoque Baixo
            await this.checkLowStock();

            // 1b. Checar Pagamentos Pendentes de E-commerce (PIX/Cartão)
            await this.checkPendingPayments();

            // 2. Pedidos Atrasados
            await this.checkOverdueOrders();

            // 3. Limpeza de Logs Antigos (Manutenção)
            await this.cleanupOldLogs();

            localStorage.setItem('last_automation_check', new Date().toISOString());
        } catch (error) {
            console.error("🦾 AutomationService: Erro nas tarefas", error);
        }
    }

    async checkLowStock() {
        // Implementação: Busca produtos com stock <= minStock
        // Em um sistema real, isso enviaria e-mail via Cloud Functions.
        // Aqui, vamos apenas gerar um log de "Alerta" no sistema se for crítico.
        const products = await db.getAll('products');
        const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock || 5));

        if (lowStock.length > 0) {
            // Verifica se já notificamos hoje para evitar spam
            const lastNotif = localStorage.getItem('last_stock_alert');
            const today = new Date().toDateString();

            if (lastNotif !== today) {
                // Criar notificação no DB (simulada por enquanto no AuditLog)
                await db.create('system_notifications', {
                    type: 'STOCK_LOW',
                    message: `${lowStock.length} produtos estão com estoque crítico.`,
                    data: lowStock.map(p => p.name),
                    timestamp: new Date().toISOString(),
                    read: false
                });
                localStorage.setItem('last_stock_alert', today);
                console.log("🦾 AutomationService: Alerta de estoque gerado.");
            }
        }
    }

    async checkOverdueOrders() {
        const orders = await db.getAll('orders');
        const today = new Date().toISOString().split('T')[0];
        
        const overdue = orders.filter(o => {
            return o.deadline && o.deadline < today && 
                   o.status !== 'completed' && 
                   o.status !== 'Concluído' && 
                   o.status !== 'cancelled';
        });

        if (overdue.length > 0) {
             const lastNotif = localStorage.getItem('last_overdue_alert');
             const todayStr = new Date().toDateString();

             if (lastNotif !== todayStr) {
                await db.create('system_notifications', {
                    type: 'ORDER_OVERDUE',
                    message: `${overdue.length} pedidos estão ATRASADOS!`,
                    data: overdue.map(o => o.id),
                    timestamp: new Date().toISOString(),
                    read: false
                });
                localStorage.setItem('last_overdue_alert', todayStr);
                console.log("🦾 AutomationService: Alerta de atraso gerado.");
             }
        }
    }

    async cleanupOldLogs() {
        // Exemplo: Limpar logs com mais de 30 dias se necessário (não implementado delete em massa ainda)
        // Isso seria perigoso sem paginação no client-side.
    }

    async checkPendingPayments() {
        const orders = await db.getAll('orders') || [];
        
        // Apenas varre Pedidos que estão pendentes e são de E-commerce.
        const pendingEcommerce = orders.filter(o => {
            return o.ecommerceOrigin && 
                   o.paymentStatus !== 'Pago' && 
                   o.paymentStatus !== 'Recebido' && 
                   o.status !== 'cancelled' &&
                   o.status !== 'Cancelado' &&
                   (o.paymentMethod === 'pix' || o.paymentMethod === 'credit_card');
        });

        if (pendingEcommerce.length === 0) return;

        console.log(`🦾 AutomationService: Varrendo status de ${pendingEcommerce.length} pagamentos no Mercado Pago...`);

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocalhost ? 'http://localhost:5173' : 'https://ateliecarol.vercel.app';

        for (const order of pendingEcommerce) {
            const mpId = order.transaction_id || order.mpPaymentId;
            if (mpId && mpId.startsWith('MOCK')) continue; 

            try {
                const urlQuery = mpId ? `paymentId=${mpId}` : `orderId=${order.id}`;
                const response = await fetch(`${baseUrl}/api/check_payment?${urlQuery}`);
                if (!response.ok) continue;
                
                const mpData = await response.json();
                
                if (mpData.status === 'approved') {
                    console.log(`💸 Pagamento Aprovado Detectado: Pedido #${order.id}`);

                    const totalOrder = Number(order.total) || 0;
                    const totalTax = mpData.fee_details ? mpData.fee_details.reduce((acc, f) => acc + (f.amount || 0), 0) : 0;
                    const netAmount = mpData.transaction_details?.net_received_amount || (totalOrder - totalTax);

                    const allTransactions = await db.getAll('transactions') || [];
                    const hasTransaction = allTransactions.some(t => String(t.orderId) === String(order.id) && t.type === 'income');

                    await db.update('orders', order.id, {
                        paymentStatus: 'Recebido',
                        amountPaid: totalOrder,
                        balanceDue: 0,
                        status: 'Em Produção',
                        paymentDate: new Date().toISOString(),
                        gatewayTaxes: totalTax,
                        gatewayNet: netAmount,
                        gatewayMethodId: mpData.payment_method_id || order.paymentMethod
                    });

                    if (!hasTransaction) {
                        await db.create('transactions', {
                            type: 'income',
                            description: `Venda E-commerce: Pedido #${String(order.id).substring(0,8)}`,
                            amount: Number(netAmount || totalOrder), 
                            date: new Date().toISOString().split('T')[0],
                            category: 'Venda de Produtos',
                            paymentMethod: mpData.payment_method_id === 'pix' ? 'PIX' : 'Cartão de Crédito',
                            status: 'paid', // Strict para FinanceFinal
                            orderId: order.id,
                            accountId: '1', 
                            auditData: { gross: totalOrder, tax: totalTax } 
                        });
                    }

                    await db.create('system_notifications', {
                        type: 'PAYMENT_RECEIVED',
                        message: `PIX/Cartão Recebido! O pedido online do(a) ${order.customer} foi pago e enviado para produção! 🚀`,
                        data: order.id,
                        timestamp: new Date().toISOString(),
                        read: false
                    });
                } else if (mpData.status === 'cancelled' || mpData.status === 'rejected') {
                    await this.cancelOrderAndRestoreStock(order, 'PIX/Cartão Expirou/Recusado no Mercado Pago. Pedido cancelado e estoque limpo.');
                } else if (mpData.status === 'pending') {
                    const orderDate = order.createdAt || order.date;
                    if (orderDate) {
                        const createdTime = new Date(orderDate).getTime();
                        const now = new Date().getTime();
                        const diffMs = now - createdTime;
                        const diffHours = diffMs / (1000 * 60 * 60);
                        if (diffHours >= 1) { 
                            console.log(`[Cancelamento Auto] Pedido ${order.id} expirou o tempo limite de PGT.`);
                            await this.cancelOrderAndRestoreStock(order, `Reserva Expirada (1 Hora) por falta de Pagamento. Cliente não concluiu a transação.`);
                        }
                    }
                }
            } catch (error) {
                console.error("🦾 Error na checagem passiva:", error);
            }
        }
    }

    async cancelOrderAndRestoreStock(order, motivo) {
        await db.update('orders', order.id, {
            status: 'Cancelado',
            paymentStatus: 'Expirado',
            cancelDate: new Date().toISOString()
        });
        
        try {
            if (order.cartItems && order.cartItems.length > 0) {
                const allProducts = await db.getAll('products') || [];
                for (const item of order.cartItems) {
                    const product = allProducts.find(p => String(p.id) === String(item.productId));
                    if (product && product.stock !== undefined) {
                        await db.update('products', product.id, {
                            stock: product.stock + (Number(item.quantity) || 1)
                        });
                    }
                }
            }
        } catch(e) { console.error("Falha ao recuperar estoque", e); }

        await db.create('system_notifications', {
            type: 'ORDER_CANCELLED',
            message: motivo,
            data: order.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
}

export default new AutomationService();
