
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
    // Generate message
    const itemsList = budget.items.map(i => `- ${i.product}: ${i.qty || i.quantity} x R$ ${Number(i.price || 0).toFixed(2)}`).join('\n');
    const total = Number(budget.total || 0).toFixed(2);
    
    const message = `*ORÇAMENTO #${budget.id}*\n\nOlá ${budget.customerName}!\n\nAqui está a proposta solicitada:\n\n${itemsList}\n\n*Total: R$ ${total}*\n\nValidade: ${new Date(budget.validUntil).toLocaleDateString('pt-BR')}\n\nPara APROVAR, responda com "SIM".\nPara REJEITAR, responda com "NÃO".`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Update status to 'Sent' if it was 'Draft'
    if (budget.status === 'Rascunho') {
        await db.update('budgets', budget.id, { status: 'Enviado' });
        fetchBudgets();
    }
  };

  const handleApprove = async (budget) => {
      if (window.confirm('Confirmar aprovação do cliente? Isso pode gerar um pedido automaticamente.')) {
        await db.update('budgets', budget.id, { status: 'Aprovado' });
        
        // Optional: Create Order
        if (window.confirm('Deseja criar um Pedido de Venda agora?')) {
            const newOrder = {
                customer: budget.customerName,
                date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                items: budget.items.length,
                total: budget.total,
                fromBudget: budget.id
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
