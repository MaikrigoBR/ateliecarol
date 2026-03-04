
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CheckCircle, XCircle, FileText } from 'lucide-react';
import db from '../services/database.js';
import { NewBudgetModal } from '../components/NewBudgetModal.jsx';

export function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBudgets = async () => {
    try {
        const allBudgets = await db.getAll('budgets');
        setBudgets(Array.isArray(allBudgets) ? allBudgets : []);
    } catch (error) {
        console.error("Error fetching budgets:", error);
        setBudgets([]);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleCreate = async (data) => {
    await db.create('budgets', data);
    fetchBudgets();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
        await db.delete('budgets', id);
        fetchBudgets();
    }
  };

  const handleSendWhatsapp = async (budget) => {
    // Abrir a aba síncronamente antes de qualquer 'await' para burlar o popup blocker
    let fallbackTab = null;

    try {
        const baseUrl = window.location.href.split('#')[0];
        const proposalLink = `${baseUrl}#/proposal/${budget.id}`;
        
        let companyName = 'nossa equipe';
        try {
            const saved = localStorage.getItem('stationery_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.companyName) companyName = parsed.companyName;
            }
        } catch(e) {}

        const firstName = budget.customerName.split(' ')[0];
        const message = `Olá, ${firstName}!\n✨ Preparamos com todo o carinho a sua proposta comercial.\n\nVocê pode conferir todos os detalhes, valores e aprovar o seu orçamento diretamente pelo nosso link interativo:\n\n${proposalLink}\n\nQualquer dúvida, a ${companyName} está à disposição!`;

        let sentViaApi = false;
        
        let num = '';
        const customers = await db.getAll('customers');
        const customerObj = customers.find(c => c.name === budget.customerName);
        
        if (customerObj && customerObj.phone) {
            num = customerObj.phone.replace(/\D/g, '');
        }

        if (num.length >= 10) {
            try {
                const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/api/campaign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targets: [{ phone: num, message: message }]
                    })
                });
                
                if (res.ok) {
                    sentViaApi = true;
                    
                    // Show Automation Toast
                    const toast = document.createElement('div');
                    toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 9999; display: flex; align-items: center; gap: 12px; transition: all 0.3s ease; transform: translateY(100px); opacity: 0;';
                    toast.innerHTML = `
                        <div style="background: #25D366; padding: 8px; border-radius: 50%; display: flex;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">Proposta Comercial (CRM)</div>
                            <div style="color: #64748b; font-size: 0.75rem;">Link enviado via API p/ <strong>${firstName}</strong></div>
                        </div>
                    `;
                    document.body.appendChild(toast);
                    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 100);
                    setTimeout(() => { toast.style.transform = 'translateY(100px)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
                }
            } catch(e) { console.warn("Background API Failed", e); }
        }

        if (!sentViaApi) {
            let finalNum = num;
            if (finalNum.length >= 10) finalNum = `55${finalNum}`;
            const url = finalNum.length >= 10 
                ? `https://wa.me/${finalNum}?text=${encodeURIComponent(message)}`
                : `https://wa.me/?text=${encodeURIComponent(message)}`;
            
            // Aqui decidimos abrir a aba no momento do fallback mesmo, ou usar uma pre-criada.
            // O ideal seria criar no início e redirecionar.
            // Porém o bloqueador costuma respeitar pequenos delays. Usaremos direct navigation aqui ou _blank direto.
            window.open(url, '_blank') || (window.location.href = url);
        }

        // Update status to 'Sent' if it was 'Draft'
        if (budget.status === 'Rascunho') {
            await db.update('budgets', budget.id.toString(), { status: 'Enviado' });
            fetchBudgets();
        }
    } catch(err) {
        console.error(err);
    }
  };

  const handleApprove = async (budget) => {
      if (window.confirm('Confirmar aprovação do cliente? Isso pode gerar um pedido automaticamente.')) {
        await db.update('budgets', budget.id, { status: 'Aprovado' });
        
        // Optional: Create Order
        if (window.confirm('Deseja criar um Pedido de Venda agora?')) {
            const mappedItems = budget.items?.map(it => ({
                productId: it.productId || '',
                name: it.productName || 'Item Orçamento',
                quantity: it.quantity || 1,
                price: it.price || 0,
                total: it.total || 0,
                productionStep: 'pending' // inicia fila
            })) || [];

            const newOrder = {
                customer: budget.customerName,
                date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                items: budget.items.length,
                total: budget.total,
                fromBudget: budget.id,
                cartItems: mappedItems
            };
            await db.create('orders', newOrder);
            alert('Pedido criado com sucesso!');
        }

        fetchBudgets();
      }
  };

  const handleReject = async (budget) => {
      if (window.confirm('Marcar orçamento como rejeitado?')) {
          await db.update('budgets', budget.id, { status: 'Rejeitado' });
          fetchBudgets();
      }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
            <h2 className="title">Orçamentos & Propostas</h2>
            <p className="text-muted">Gerencie propostas comerciais e envie via WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
                type="text" 
                placeholder="Buscar (Cliente ou ID)..." 
                className="form-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
                className="form-input" 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{ backgroundColor: 'var(--surface)' }}
            >
                <option value="">Status (Todos)</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Enviado">Enviado</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Rejeitado">Rejeitado</option>
            </select>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              Novo Orçamento
            </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Validade</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {budgets
                .filter(b => {
                    const search = searchTerm.toLowerCase();
                    const idStr = b.id ? b.id.toString() : '';
                    const matchSearch = b.customerName?.toLowerCase().includes(search) || idStr.includes(search);
                    const matchStatus = statusFilter === '' || b.status === statusFilter;
                    return matchSearch && matchStatus;
                })
                .map(budget => (
                <tr key={budget.id}>
                  <td className="text-muted">#{budget.id}</td>
                  <td style={{ fontWeight: 500 }}>{budget.customerName}</td>
                  <td className="text-muted">{new Date(budget.date).toLocaleDateString('pt-BR')}</td>
                  <td className="text-muted">{new Date(budget.validUntil).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: 600 }}>R$ {Number(budget.total || 0).toFixed(2).replace('.', ',')}</td>
                  <td>
                    <span className={`badge ${
                        budget.status === 'Aprovado' ? 'badge-success' :
                        budget.status === 'Rejeitado' ? 'badge-danger' :
                        budget.status === 'Enviado' ? 'badge-primary' : 'badge-neutral'
                    }`}>
                        {budget.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                            className="btn btn-icon" 
                            title="Enviar WhatsApp"
                            onClick={() => handleSendWhatsapp(budget)}
                            style={{ color: '#25D366' }}
                        >
                            <Send size={16} />
                        </button>
                        
                        {budget.status !== 'Aprovado' && budget.status !== 'Rejeitado' && (
                            <>
                                <button 
                                    className="btn btn-icon" 
                                    title="Aprovar"
                                    onClick={() => handleApprove(budget)}
                                    style={{ color: 'var(--success)' }}
                                >
                                    <CheckCircle size={16} />
                                </button>
                                <button 
                                    className="btn btn-icon" 
                                    title="Rejeitar"
                                    onClick={() => handleReject(budget)}
                                    style={{ color: 'var(--danger)' }}
                                >
                                    <XCircle size={16} />
                                </button>
                            </>
                        )}
                        
                        <button 
                            className="btn btn-icon" 
                            title="Excluir"
                            onClick={() => handleDelete(budget.id)}
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
               {budgets.length === 0 && (
                  <tr>
                      <td colSpan="7" className="text-center p-4 text-muted">
                          Nenhum orçamento encontrado.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewBudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onBudgetCreated={fetchBudgets} 
      />
    </div>
  );
}
