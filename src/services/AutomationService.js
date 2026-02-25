
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
}

export default new AutomationService();
