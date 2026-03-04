import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, DollarSign, Package, TrendingUp, Users, Filter, Briefcase } from 'lucide-react';
import db from '../services/database.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
  });
  
  // Data State
  const [data, setData] = useState({
      orders: [],
      inventory: [],
      products: [],
      transactions: [],
      customers: []
  });

  const [filteredData, setFilteredData] = useState([]);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('all');
  const [financeTypeFilter, setFinanceTypeFilter] = useState('all'); // all, receivable, payable

  useEffect(() => {
      fetchData();
  }, []);

  useEffect(() => {
      applyFilters();
  }, [data, activeTab, dateRange, categoryFilter, customerTypeFilter, customerStatusFilter, financeTypeFilter]);

  const fetchData = async () => {
      try {
          const orders = await db.getAll('orders') || [];
          const inventory = await db.getAll('inventory') || [];
          const products = await db.getAll('products') || [];
          const transactions = await db.getAll('transactions') || [];
          const customers = await db.getAll('customers') || [];
          setData({ orders, inventory, products, transactions, customers });
      } catch (error) {
          console.error("Error fetching data", error);
      }
  };

  const applyFilters = () => {
      let result = [];
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);

      switch (activeTab) {
          case 'sales':
              result = data.orders.filter(order => {
                  const orderDateString = order.date || order.createdAt;
                  if (!orderDateString) return false;
                  const orderDate = new Date(orderDateString);
                  const dateMatch = orderDate >= start && orderDate <= end;
                  const statusMatch = order.status !== 'cancelled' && order.status !== 'Cancelado';
                  return dateMatch && statusMatch;
              });
              break;
          
          case 'inventory':
              result = data.inventory;
              break;

          case 'finance':
              result = data.transactions.filter(t => {
                  const tDate = new Date(t.date);
                  const dateMatch = tDate >= start && tDate <= end;
                  
                  if (financeTypeFilter === 'receivable') {
                      return dateMatch && t.type === 'income' && t.status === 'pending';
                  } else if (financeTypeFilter === 'payable') {
                      return dateMatch && t.type === 'expense' && t.status === 'pending';
                  } else if (financeTypeFilter === 'paid_income') {
                      return dateMatch && t.type === 'income' && t.status === 'paid';
                  } else if (financeTypeFilter === 'paid_expense') {
                      return dateMatch && t.type === 'expense' && t.status === 'paid';
                  }

                  return dateMatch;
              });
              break;

          case 'customers':
              result = data.customers.filter(c => {
                  const typeMatch = customerTypeFilter === 'all' || c.type === customerTypeFilter;
                  // Default to active if undefined for legacy data
                  const status = c.status || 'active'; 
                  const statusMatch = customerStatusFilter === 'all' || status === customerStatusFilter;
                  return typeMatch && statusMatch;
              });
              break;
      }
      setFilteredData(result);
  };

  /* --- EXPORT --- */
  const exportPDF = () => {
      try {
          const doc = new jsPDF();
          doc.setFontSize(18);
          const titleMap = {
              'sales': 'Relatório de Vendas',
              'inventory': 'Relatório de Estoque Valorado',
              'finance': 'Relatório Financeiro',
              'customers': 'Relatório de Clientes'
          };
          doc.text(titleMap[activeTab], 14, 22);
          doc.setFontSize(11);
          doc.text(`Gerado em: ${new Date().toLocaleDateString()} - Período: ${dateRange.start} a ${dateRange.end}`, 14, 30);

          const tableColumn = [];
          const tableRows = [];

          if (activeTab === 'sales') {
              tableColumn.push("Data", "Cliente", "Status", "Valor (R$)");
              filteredData.forEach(order => {
                  const dString = order.date || order.createdAt;
                  const dateVal = dString ? new Date(dString).toLocaleDateString() : '-';
                  tableRows.push([
                      dateVal,
                      order.customer || order.customerName || 'Cliente Final',
                      order.status || 'Não Informado',
                      `R$ ${(parseFloat(order.total) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
                  ]);
              });
              const total = filteredData.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
              tableRows.push(['', '', 'TOTAL:', `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]);

          } else if (activeTab === 'inventory') {
              tableColumn.push("Item", "Tipo", "Qtd", "Custo Unit.", "Total");
              filteredData.forEach(item => {
                  tableRows.push([
                      item.name,
                      item.type,
                      `${item.quantity || 0} ${item.unit || ''}`,
                      `R$ ${(parseFloat(item.cost) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                      `R$ ${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
                  ]);
              });

          } else if (activeTab === 'finance') {
              tableColumn.push("Data", "Descrição", "Categoria", "Tipo", "Status", "Valor");
              filteredData.forEach(t => {
                  tableRows.push([
                      t.date ? new Date(t.date).toLocaleDateString() : '-',
                      t.description,
                      t.category,
                      t.type === 'income' ? 'Receita' : 'Despesa',
                      t.status === 'paid' ? 'Pago' : 'Pendente',
                      `R$ ${(parseFloat(t.amount) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
                  ]);
              });
              const balance = filteredData.reduce((acc, t) => acc + (t.type === 'income' ? (parseFloat(t.amount)||0) : -(parseFloat(t.amount)||0)), 0);
              tableRows.push(['', '', '', '', 'BALANÇO:', `R$ ${balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]);

          } else if (activeTab === 'customers') {
              tableColumn.push("Nome", "Email", "Tipo", "Documento", "Status");
              filteredData.forEach(c => {
                  tableRows.push([
                      c.name,
                      c.email || '-',
                      c.type || 'PF',
                      c.document || '-',
                      c.status === 'inactive' ? 'Inativo' : 'Ativo'
                  ]);
              });
          }

          // Blindar inputs do autoTable contra valores nulos/objetos
          const safeTableRows = tableRows.map(row => row.map(cell => {
              if (cell === null || cell === undefined) return '-';
              if (typeof cell === 'object') return JSON.stringify(cell);
              return String(cell);
          }));

          autoTable(doc, {
              head: [tableColumn],
              body: safeTableRows,
              startY: 40
          });
          
          doc.save(`relatorio_${activeTab}_export.pdf`);
      } catch (err) {
          console.error("Erro na exportação de PDF", err);
          alert("Ops! Ocorreu um erro ao gerar este PDF. Os dados podem estar inconsistentes. Detalhes: " + err.message);
      }
  };

  const exportExcel = () => {
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
      XLSX.writeFile(workbook, `relatorio_${activeTab}.xlsx`);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px' }}>
      <div className="flex justify-between items-center mb-6">
          <h2 className="title flex items-center gap-sm">
              <FileText size={24} /> Central de Relatórios
          </h2>
          <div className="flex gap-sm">
              <button onClick={exportExcel} className="btn btn-secondary text-sm">
                  <Download size={16} /> Excel
              </button>
              <button onClick={exportPDF} className="btn btn-primary text-sm">
                  <Download size={16} /> PDF
              </button>
          </div>
      </div>

      <div className="card mb-6">
          <div className="tabs">
                <button className={`tab-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Vendas</button>
                <button className={`tab-item ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>Financeiro</button>
                <button className={`tab-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Clientes</button>
                <button className={`tab-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Estoque</button>
          </div>
          
          {/* Global Date Filter for Sales and Finance */}
          {(activeTab === 'sales' || activeTab === 'finance') && (
               <div className="filters-row mb-6">
                   <div className="flex items-center gap-2">
                       <span className="text-sm font-semibold text-muted flex items-center gap-2">
                            <Calendar size={18} /> Período:
                       </span>
                       <input type="date" className="form-input w-auto" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                       <span className="text-muted text-sm">até</span>
                       <input type="date" className="form-input w-auto" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                   </div>
                   
                   {activeTab === 'finance' && (
                       <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-muted flex items-center gap-2">
                                <Filter size={18} /> Tipo:
                            </span>
                            <select className="form-input w-auto" value={financeTypeFilter} onChange={e => setFinanceTypeFilter(e.target.value)}>
                                <option value="all">Todas as Movimentações</option>
                                <option value="paid_income">Recebimentos Realizados</option>
                                <option value="paid_expense">Pagamentos Realizados</option>
                                <option value="receivable">Contas a Receber (Pendente)</option>
                                <option value="payable">Contas a Pagar (Pendente)</option>
                            </select>
                       </div>
                   )}
               </div>
          )}

           {/* Filters for Customers */}
           {activeTab === 'customers' && (
               <div className="filters-row mb-6">
                   <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-muted">Tipo:</span>
                            <select className="form-input w-auto" value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)}>
                                <option value="all">Todos</option>
                                <option value="PF">Pessoa Física</option>
                                <option value="PJ">Pessoa Jurídica</option>
                            </select>
                       </div>
                       <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-muted">Status:</span>
                            <select className="form-input w-auto" value={customerStatusFilter} onChange={e => setCustomerStatusFilter(e.target.value)}>
                                <option value="all">Todos</option>
                                <option value="active">Ativos</option>
                                <option value="inactive">Inativos</option>
                            </select>
                       </div>
                   </div>
               </div>
           )}

          {/* TABLE RENDER */}
          <div className="table-container p-2">
              <table className="table">
                  <thead>
                      {activeTab === 'sales' && <tr><th>Data</th><th>Cliente</th><th>Status</th><th>Total</th></tr>}
                      {activeTab === 'finance' && <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Status</th><th>Valor</th></tr>}
                      {activeTab === 'customers' && <tr><th>Nome</th><th>Email</th><th>Tipo</th><th>Documento</th><th>Status</th></tr>}
                      {activeTab === 'inventory' && <tr><th>Item</th><th>Tipo</th><th>Qtd</th><th>Custo Unit.</th><th>Total</th></tr>}
                  </thead>
                  <tbody>
                      {activeTab === 'sales' && filteredData.map(order => (
                          <tr key={order.id}>
                              <td>{new Date(order.date || order.createdAt).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 500 }}>{order.customer || order.customerName || 'Cliente Final'}</td>
                              <td><span className={`badge badge-${(order.status === 'completed' || order.status === 'Concluído') ? 'success' : 'neutral'}`}>{order.status}</span></td>
                              <td style={{ fontWeight: 600 }}>R$ {(parseFloat(order.total) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          </tr>
                      ))}

                      {activeTab === 'finance' && filteredData.map(t => (
                          <tr key={t.id}>
                              <td>{new Date(t.date).toLocaleDateString()}</td>
                              <td>{t.description}</td>
                              <td><span className="badge badge-neutral">{t.category}</span></td>
                              <td>
                                  <span className={t.type === 'income' ? 'text-success' : 'text-danger'}>
                                      {t.type === 'income' ? 'Receita' : 'Despesa'}
                                  </span>
                              </td>
                              <td>
                                   <span className={`badge ${t.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                  </span>
                              </td>
                              <td className="font-bold">R$ {(t.amount || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          </tr>
                      ))}

                      {activeTab === 'customers' && filteredData.map(c => (
                          <tr key={c.id}>
                              <td>{c.name}</td>
                              <td>{c.email}</td>
                              <td><span className="badge badge-neutral">{c.type || 'PF'}</span></td>
                              <td>{c.document || '-'}</td>
                              <td>
                                  <span className={`badge ${(!c.status || c.status === 'active') ? 'badge-success' : 'badge-danger'}`}>
                                      {(!c.status || c.status === 'active') ? 'Ativo' : 'Inativo'}
                                  </span>
                              </td>
                          </tr>
                      ))}
                      
                       {activeTab === 'inventory' && filteredData.map(item => (
                          <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.type}</td>
                              <td>{item.quantity} {item.unit}</td>
                              <td>R$ {(item.cost || 0).toFixed(2)}</td>
                              <td>R$ {((item.quantity || 0) * (item.cost || 0)).toFixed(2)}</td>
                          </tr>
                      ))}

                      {filteredData.length === 0 && (
                          <tr><td colSpan="10" className="text-center p-6 text-muted">Nenhum dado encontrado com os filtros selecionados.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
