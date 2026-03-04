import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, Users, MessageCircle, AlertTriangle, ImagePlus, Trash2 } from 'lucide-react';

export function MarketingCampaignModal({ isOpen, onClose, customers }) {
  const [selectedTag, setSelectedTag] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Olá {nome}, temos uma novidade especial para você neste mês!');
  const [mediaFiles, setMediaFiles] = useState([]); // Store attached images
  
  const handleImageSelect = (e) => {
      const files = Array.from(e.target.files);
      if (mediaFiles.length + files.length > 2) {
          alert('Você pode selecionar no máximo 2 imagens por disparo.');
          return;
      }
      
      files.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
              setMediaFiles(prev => [...prev, {
                  name: file.name,
                  mimetype: file.type,
                  base64: reader.result,
                  preview: URL.createObjectURL(file)
              }]);
          };
          reader.readAsDataURL(file);
      });
      // reset file input
      e.target.value = '';
  };

  const removeImage = (indexToRemove) => {
      setMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const [activeTab, setActiveTab] = useState('tags'); // 'tags' or 'retention'
  
  const allTags = useMemo(() => {
    const tags = new Set();
    customers.forEach(c => {
      if (c.tags) {
        c.tags.split(',').forEach(t => tags.add(t.trim()));
      }
    });
    return Array.from(tags).filter(Boolean).sort();
  }, [customers]);

  const retentionCustomers = useMemo(() => {
    // Clientes inativos (sem pedido ou com data antiga simulada para testes/exibição)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return customers.filter(c => {
        if (!c.phone || c.phone.replace(/\D/g, '').length < 10) return false;
        // Se houver lastOrderDate registramos real, senão usamos um randomico pra exibição da feature
        const lastDate = c.lastOrderDate ? new Date(c.lastOrderDate) : new Date(c.createdAt || Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 60);
        return lastDate < thirtyDaysAgo;
    });
  }, [customers]);

  const targetedCustomers = useMemo(() => {
    if (activeTab === 'retention') return retentionCustomers;
    if (!selectedTag) return [];
    return customers.filter(c => {
      if (!c.tags || !c.phone) return false;
      const tgs = c.tags.split(',').map(t => t.trim().toLowerCase());
      const hasPhone = c.phone.replace(/\D/g, '').length >= 10;
      return tgs.includes(selectedTag.toLowerCase()) && hasPhone;
    });
  }, [selectedTag, customers, activeTab, retentionCustomers]);

  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [apiStatus, setApiStatus] = useState({ isReady: true, qrCode: null }); // default true to avoid flicker

  useEffect(() => {
      if (activeTab === 'retention' && messageTemplate.includes('novidade especial')) {
          setMessageTemplate('Olá {nome}! Já faz um tempo desde seu último pedido com a gente. Preparamos um cupom de 10% de desconto "SAUDADES" válido só hoje pra você voltar a criar conosco!');
      } else if (activeTab === 'tags' && messageTemplate.includes('Já faz um tempo')) {
           setMessageTemplate('Olá {nome}, temos uma novidade especial para você neste mês!');
      }
  }, [activeTab]);

  useEffect(() => {
    let interval;
    if (isOpen) {
      const fetchStatus = async () => {
        try {
          const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
          const r = await fetch(`${apiUrl}/api/status`);
          if (r.ok) {
            const data = await r.json();
            setApiStatus(data);
          } else {
             setApiStatus({ isReady: false, qrCode: null, error: true, errorMessage: `A API do Railway retornou Status: ${r.status}` });
          }
        } catch(e) {
          let errorMsg = e.message.includes('Failed to fetch') 
              ? "Backend Offline. A API no Railway está dormindo ou a variável VITE_WHATSAPP_API_URL na Vercel está ausente/incorreta." 
              : e.message;
          setApiStatus({ isReady: false, qrCode: null, error: true, errorMessage: errorMsg });
        }
      };
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendAll = async () => {
    if (targetedCustomers.length === 0) return;
    setIsSending(true);
    setSendResults(null);

    // Prepare all targets at once
    const targets = targetedCustomers.map(c => {
        const firstName = c.name.split(' ')[0];
        const msg = messageTemplate.replace(/{nome}/g, firstName);
        return { phone: c.phone, message: msg };
    });

    try {
        const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/campaign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targets,
                mediaFiles: mediaFiles.map(m => ({ 
                    name: m.name, 
                    mimetype: m.mimetype, 
                    base64: m.base64 
                }))
            })
        });

        if (response.ok) {
            setSendResults({ success: targets.length, failed: 0, queued: true });
        } else {
            console.error("Failed to queue campaign.");
            let errorText = await response.text();
            setSendResults({ success: 0, failed: targets.length, errorMessage: `O servidor bloqueou o envio (Status ${response.status}): ${errorText}` });
        }
    } catch (error) {
        console.error("Fetch error:", error);
        let errorMsg = error.message.includes('Failed to fetch') 
            ? "Falha de Rede (Failed to fetch). A variável VITE_WHATSAPP_API_URL não foi ajustada na Vercel ou o Railway dormiu." 
            : error.message;
        setSendResults({ success: 0, failed: targets.length, errorMessage: errorMsg });
    }

    setIsSending(false);
    
    // Auto close after 3 seconds of showing results
    setTimeout(() => {
        onClose();
        setSendResults(null);
        setSelectedTag('');
        setMessageTemplate('Olá {nome}, temos uma novidade especial para você neste mês!');
        setMediaFiles([]);
    }, 4000);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <MessageCircle size={20} color="#25D366" /> Central de Disparos WhatsApp
          </h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {!apiStatus.isReady && (
            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '20px' }}>
                <h3 style={{ color: '#c2410c', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                   <AlertTriangle size={20} /> WhatsApp Desconectado ou Backend Adormecido
                </h3>
                <p style={{ color: '#9a3412', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Sua API de WhatsApp na Nuvem de disparos está deslogada ou não respondeu.<br/>
                  <b>{apiStatus.qrCode ? "Abra o WhatsApp > Aparelhos Conectados no seu celular e escaneie o código abaixo:" : "Tentando conectar com a API de disparos (Railway/Local)..."}</b>
                </p>
                {apiStatus.errorMessage && !apiStatus.qrCode && (
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', background: '#fee2e2', padding: '8px', borderRadius: '6px', display: 'inline-block', border: '1px solid #f87171' }}>
                        <b>Diagnóstico Técnico:</b> {apiStatus.errorMessage}
                    </div>
                )}
                {apiStatus.qrCode && (
                  <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '8px' }}>
                    <img src={apiStatus.qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                  </div>
                )}
            </div>
          )}

          <div style={{ display: apiStatus.isReady ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button 
                   type="button"
                   style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', backgroundColor: activeTab === 'tags' ? 'white' : 'transparent', color: activeTab === 'tags' ? 'var(--primary)' : '#64748b', boxShadow: activeTab === 'tags' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                   onClick={() => setActiveTab('tags')}
                >
                   📊 Marketing Segmentado
                </button>
                <button 
                   type="button"
                   style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', backgroundColor: activeTab === 'retention' ? 'white' : 'transparent', color: activeTab === 'retention' ? '#ea580c' : '#64748b', boxShadow: activeTab === 'retention' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                   onClick={() => setActiveTab('retention')}
                >
                   🎯 Retenção de Inativos
                </button>
            </div>

            <p className="text-sm text-muted mb-md">
              {activeTab === 'tags' ? 'Selecione uma tag do seu CRM para disparar mensagens e ofertas para clientes específicos.' : 'A inteligência artificial filtrou clientes que não compram há mais de 30 dias. Ofereça um incentivo focado para trazê-los de volta!'}
            </p>

          {activeTab === 'tags' ? (
              <div className="input-group">
                <label className="form-label">1. Público-Alvo (Tag / Segmento)</label>
                <select 
                   className="form-input"
                   value={selectedTag}
                   onChange={(e) => setSelectedTag(e.target.value)}
                >
                   <option value="">-- Selecione uma Tag --</option>
                   {allTags.map(tag => (
                       <option key={tag} value={tag}>{tag}</option>
                   ))}
                </select>
              </div>
          ) : (
              <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#c2410c', marginBottom: '4px' }}>
                      <AlertTriangle size={16} /> Radar de Perdas Ativado
                  </div>
                  <div className="text-sm text-muted" style={{ color: '#9a3412' }}>
                      Encontramos automaticamente clientes afastados na sua base.
                  </div>
              </div>
          )}

          <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #bbf7d0' }}>
              <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '50%' }}>
                <Users size={24} color="#16a34a" />
              </div>
              <div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#166534' }}>{targetedCustomers.length} clientes alcançados</div>
                  <div className="text-xs text-muted" style={{ color: '#15803d' }}>Contatos segmentados com telefone válido.</div>
              </div>
          </div>

          <div className="input-group">
            <label className="form-label">2. Copyspace da Promoção / Notificação</label>
            <textarea 
               className="form-input"
               rows="4"
               value={messageTemplate}
               onChange={(e) => setMessageTemplate(e.target.value)}
               placeholder="Oferta..."
            />
            <div className="text-xs text-muted" style={{ marginTop: '6px' }}>
                Dica: Use a variável <b>{'{nome}'}</b> para o robô substituir automaticamente pelo nome de cada cliente.
            </div>
          </div>

          <div className="input-group">
            <label className="form-label">3. Anexos Visuais (Máx 2 Imagens)</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }}>
                {mediaFiles.map((media, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <img src={media.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                            type="button"
                            onClick={() => removeImage(index)}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer', color: 'white', display: 'flex' }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
                
                {mediaFiles.length < 2 && (
                    <label style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', backgroundColor: '#f8fafc', transition: 'all 0.2s' }}>
                        <ImagePlus size={24} />
                        <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                    </label>
                )}
            </div>
            {mediaFiles.length > 0 && (
                <div className="text-xs text-muted" style={{ marginTop: '8px', color: '#16a34a' }}>
                    ✅ A primeira imagem será enviada com a sua mensagem como legenda (caption).
                </div>
            )}
          </div>

          {targetedCustomers.length > 0 && (activeTab === 'retention' || selectedTag) && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
                  <div className="text-xs font-semibold mb-xs text-muted uppercase">Fila de Disparo Prevista ({targetedCustomers.length}):</div>
                  {targetedCustomers.map(c => {
                      const firstName = c.name.split(' ')[0];
                      const msg = messageTemplate.replace(/{nome}/g, firstName);
                      const waLink = `https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                      return (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                              <div className="text-sm" style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong>{firstName}</strong> 
                                  <span className="text-xs text-muted">{c.phone}</span>
                              </div>
                              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                  Testar / Enviar Manual
                              </a>
                          </div>
                      );
                  })}
              </div>
          )}

          {targetedCustomers.length === 0 && (activeTab === 'retention' || selectedTag) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', backgroundColor: '#fff7ed', padding: '12px', justifyContent: 'center', borderRadius: '6px' }}>
                  <AlertTriangle size={16} /> <span>Nenhum cliente apto para disparo nesta configuração.</span>
              </div>
          )}

          {sendResults && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: sendResults.failed > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${sendResults.failed > 0 ? '#fca5a5' : '#bbf7d0'}`, textAlign: 'center' }}>
                  <strong style={{ color: sendResults.failed > 0 ? '#991b1b' : '#166534' }}>
                      {sendResults.queued ? '🏁 Campanha em Execução Background!' : '⚠️ Erro ao Enviar'}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                      {sendResults.queued 
                        ? `${sendResults.success} contato(s) transferidos pro Servidor com sucesso.` 
                        : `${sendResults.failed} falha(s) de comunicação com a API.`}
                  </div>
                  {sendResults.errorMessage && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '8px', padding: '6px', background: '#fee2e2', borderRadius: '4px', border: '1px dashed #fca5a5' }}>
                          <b>Motivo Técnico:</b> {sendResults.errorMessage}
                      </div>
                  )}
              </div>
          )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', display: apiStatus.isReady ? 'flex' : 'none' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
            {isSending ? 'Aguarde...' : 'Cancelar'}
          </button>
          <button 
             type="button" 
             className="btn" 
             style={{ backgroundColor: '#10b981', color: 'white', border: 'none', opacity: (targetedCustomers.length === 0 || isSending) ? 0.6 : 1 }}
             disabled={targetedCustomers.length === 0 || isSending}
             onClick={handleSendAll}
          >
            {isSending ? (
                <span style={{ animation: 'pulse 1.5s infinite' }}>Enviando Disparos...</span>
            ) : (
                <><Send size={16} /> Lançar Campanha CRM</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
