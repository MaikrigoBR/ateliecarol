import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Image as ImageIcon, ExternalLink, Trash2, Search, Tag, FolderOpen, Edit2, Copy, CheckCircle, Link as LinkIcon, Settings, X, Palette, Box, Grid } from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import AuditService from '../services/AuditService';

// Auto-Thumbnail Helper for Google Drive and standard images
const getAutoThumbnail = (url) => {
    if (!url) return '';
    if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null) return url;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    if (urlParams.get('id')) {
        return `https://drive.google.com/thumbnail?id=${urlParams.get('id')}&sz=w800`;
    }
    return '';
};

export function DesignLibrary() {
    const { currentUser } = useAuth();
    const [designs, setDesigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [filterProduct, setFilterProduct] = useState('Todos');
    
    // Manage Categories Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [rawCategories, setRawCategories] = useState([]);
    const [designCategories, setDesignCategories] = useState(['Geral']);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerDesign, setViewerDesign] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const [formData, setFormData] = useState({ 
        name: '', 
        category: 'Geral', 
        thumbnailUrl: '', 
        fileUrl: '', 
        tags: '',
        productId: '', 
        description: '',
        status: 'Aprovado' 
    });

    const fetchData = async () => {
        const allDesigns = await db.getAll('designs') || [];
        const allProducts = await db.getAll('products') || [];
        
        let allCategories = await db.getAll('categories') || [];
        const designCats = allCategories.filter(c => c.type === 'design');
        if (designCats.length === 0) {
            const defaultCats = ['Geral', 'Casamento', 'Corporativo', 'Sazonal', 'Identidade Visual'];
            const promises = defaultCats.map(name => db.create('categories', { name, type: 'design', color: '#8b5cf6' }));
            await Promise.all(promises);
            allCategories = await db.getAll('categories') || [];
        }

        setRawCategories(allCategories);
        setDesignCategories(allCategories.filter(c => c.type === 'design').map(c => c.name));
        setProducts(allProducts.sort((a,b) => a.name.localeCompare(b.name)));
        setDesigns(allDesigns.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let results = designs;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(d => 
                d.name?.toLowerCase().includes(term) || 
                d.tags?.toLowerCase().includes(term) ||
                d.description?.toLowerCase().includes(term)
            );
        }

        if (filterCategory !== 'Todas') {
            results = results.filter(d => d.category === filterCategory);
        }

        if (filterProduct !== 'Todos') {
             results = results.filter(d => String(d.productId) === String(filterProduct));
        }

        setFilteredDesigns(results);
    }, [searchTerm, filterCategory, filterProduct, designs]);

    const handleSave = async (e) => {
        e.preventDefault();
        if(!formData.name) return;
        
        // Auto-Generate Thumbnail se estiver vazio
        let finalThumb = formData.thumbnailUrl;
        if (!finalThumb && formData.fileUrl) {
            finalThumb = getAutoThumbnail(formData.fileUrl);
        }

        const payload = {
            ...formData,
            thumbnailUrl: finalThumb,
        };

        if (editId) {
            payload.updatedAt = new Date().toISOString();
            await db.update('designs', editId, payload);
            AuditService.log(currentUser, 'UPDATE', 'Designs', editId, `Atualizou modelo: ${payload.name}`);
        } else {
            payload.createdAt = new Date().toISOString();
            payload.createdBy = currentUser?.email || 'unknown';
            const res = await db.create('designs', payload);
            AuditService.log(currentUser, 'CREATE', 'Designs', res.id, `Criou novo modelo: ${payload.name}`);
        }

        closeModal();
        fetchData();
    };

    const handleDelete = async (id, name, e) => {
        e.stopPropagation();
        if(window.confirm(`Tem certeza que deseja excluir permanentemente o modelo: ${name}?`)) {
            await db.delete('designs', id);
            AuditService.log(currentUser, 'DELETE', 'Designs', id, `Excluiu modelo: ${name}`);
            fetchData();
            setIsViewerOpen(false);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        await db.create('categories', { name: newCategoryName.trim(), type: 'design', color: '#8b5cf6' });
        setNewCategoryName('');
        fetchData();
    };

    const handleDeleteCategory = async (id, name) => {
        if(confirm(`Excluir a categoria '${name}'?`)) {
            await db.delete('categories', id);
            fetchData();
        }
    };

    const copyToClipboard = (text, id, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openEdit = (design, e) => {
        if(e) e.stopPropagation();
        setFormData({ 
            name: design.name || '', 
            category: design.category || 'Geral', 
            thumbnailUrl: design.thumbnailUrl || '', 
            fileUrl: design.fileUrl || '', 
            tags: design.tags || '',
            productId: design.productId || '',
            description: design.description || '',
            status: design.status || 'Aprovado'
        });
        setEditId(design.id);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditId(null);
        setFormData({ name: '', category: 'Geral', thumbnailUrl: '', fileUrl: '', tags: '', productId: '', description: '', status: 'Aprovado' });
    };

    const openViewer = (design) => {
        setViewerDesign(design);
        setIsViewerOpen(true);
    };

    return (
        <div className="animate-fade-in">
            {/* Seguindo o padrão card-header do Products.jsx */}
            <div className="card-header items-center flex-wrap gap-4">
                <div className="flex gap-2 items-center flex-wrap w-full md:w-auto">
                    <div className="input-group" style={{ marginBottom: 0, width: '250px' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar modelos..." 
                            className="form-input shadow-sm w-full" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="form-input min-w-[150px] shadow-sm text-sm" 
                        style={{ marginBottom: 0 }}
                        value={filterCategory} 
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="Todas">Todas Categorias</option>
                        {designCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                        className="form-input min-w-[150px] shadow-sm text-sm" 
                        style={{ marginBottom: 0 }}
                        value={filterProduct} 
                        onChange={e => setFilterProduct(e.target.value)}
                    >
                        <option value="Todos">Todos os Produtos</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto">
                    <button className="btn btn-outline flex items-center gap-2 whitespace-nowrap bg-white text-gray-700 hover:text-blue-600 border-gray-200" onClick={() => setIsCategoryModalOpen(true)}>
                        <Settings size={16} /> Categorias
                    </button>
                    <button className="btn btn-primary shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap" onClick={() => { closeModal(); setIsModalOpen(true); }}>
                        <Plus size={16} /> Novo Modelo
                    </button>
                </div>
            </div>

            {/* Seguindo o padrão product-grid do Products.jsx */}
            <div className="product-grid">
                {filteredDesigns.map(design => (
                    <div 
                        key={design.id} 
                        className="card cursor-pointer hover:shadow-lg transition-all flex flex-col h-full" 
                        onClick={() => openViewer(design)}
                    >
                        <div className="product-image-container relative bg-slate-100 flex items-center justify-center overflow-hidden">
                            {/* Badges */}
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 ${
                                    design.status === 'Aprovado' ? 'bg-green-500 text-white' :
                                    design.status === 'Rascunho' ? 'bg-slate-500 text-white' :
                                    'bg-amber-500 text-white'
                                }`}>
                                    {design.status}
                                </div>
                                {design.productId && (
                                    <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                        Vinculado
                                    </div>
                                )}
                            </div>

                            {design.thumbnailUrl ? (
                                <img src={design.thumbnailUrl} alt={design.name} className="product-image" style={{ objectFit: 'contain' }} />
                            ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ marginBottom: 'var(--space-sm)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className="product-action-row mt-2">
                                <h3 className="product-title line-clamp-2" title={design.name}>{design.name}</h3>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    {design.fileUrl && (
                                        <button 
                                            className="btn btn-icon" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(design.fileUrl, '_blank');
                                            }}
                                            title="Abrir Fonte Original"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                    )}
                                    <button 
                                        className="btn btn-icon" 
                                        onClick={(e) => openEdit(design, e)}
                                        title="Editar Modelo"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        className="btn btn-icon" 
                                        style={{ padding: '4px', color: 'var(--danger)' }}
                                        onClick={(e) => handleDelete(design.id, design.name, e)}
                                        title="Excluir Modelo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <span className="text-sm text-muted mb-2 block">{design.category}</span>
                            
                            {/* Render Tags */}
                            <div className="mt-auto flex flex-wrap gap-1">
                                {design.tags ? design.tags.split(',').slice(0, 3).map((tag, i) => (
                                    <span key={i} className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                        #{tag.trim()}
                                    </span>
                                )) : <span className="text-[10px] text-slate-400 italic">Sem tags</span>}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredDesigns.length === 0 && (
                    <div className="col-span-full py-16 text-center text-muted border-2 border-dashed border-border rounded-xl bg-surface-hover/50">
                        <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-text-primary mb-1">Nenhum modelo econtrado</h3>
                        <p className="text-sm">Tente ajustar a busca ou clique em 'Novo Modelo' para alimentar seu acervo.</p>
                    </div>
                )}
            </div>

            {/* Form Modal (Add / Edit) usando os estilos padrão */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title font-bold flex items-center gap-2">
                                <FolderOpen size={20} className="text-primary"/> 
                                {editId ? 'Editar Modelo Designer' : 'Novo Arquivo de Designer'}
                            </h2>
                            <button type="button" className="btn btn-icon" onClick={closeModal}><X size={20} /></button>
                        </div>
                        
                        <div className="modal-body">
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Identificação / Nome da Peça *</label>
                                    <input 
                                        type="text" 
                                        className="form-input w-full" 
                                        required 
                                        placeholder="Ex: Arte Caneca Dia das Mães Floral" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        autoFocus 
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>Categoria</label>
                                        <select className="form-input w-full" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                            {designCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>Status do Projeto</label>
                                        <select className="form-input w-full font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                            <option value="Aprovado">Final / Aprovado</option>
                                            <option value="Pendente">Aguardando Avaliação</option>
                                            <option value="Rascunho">Rascunho / Sem Camadas</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Vínculo Comercial (Associação com Produto de Venda)</label>
                                    <select className="form-input w-full bg-slate-50 border-slate-300" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                                        <option value="">(Nenhum Produto Associado)</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>URL do Arquivo Fonte (Drive, Dropbox, Canva)</label>
                                    <input 
                                        type="text" 
                                        className="form-input w-full" 
                                        placeholder="Cole o link onde está o arquivo fonte..." 
                                        value={formData.fileUrl} 
                                        onChange={e => setFormData({...formData, fileUrl: e.target.value})} 
                                    />
                                    <div className="text-[11px] text-muted mt-1">O sistema irá gerar imagens automáticas para Links do Google Drive visando facilitar seu portfólio.</div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>URL Da Imagem Customizada (Opcional)</label>
                                    <input 
                                        type="text" 
                                        className="form-input w-full" 
                                        placeholder="Ex: https://i.imgur.com/foto.jpg" 
                                        value={formData.thumbnailUrl} 
                                        onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Tags para Ajuda na Busca (Separados por vírgula)</label>
                                    <input 
                                        type="text" 
                                        className="form-input w-full" 
                                        placeholder="Ex: mockup, cliente vip, teste" 
                                        value={formData.tags} 
                                        onChange={e => setFormData({...formData, tags: e.target.value})} 
                                    />
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Parâmetros da Arte / Observações Técnicas</label>
                                    <textarea 
                                        className="form-input w-full" 
                                        style={{ minHeight: '80px', resize: 'vertical' }}
                                        placeholder="Ex: Fonte usada Lobster. Margem de sangria 2cm." 
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                    />
                                </div>
                                
                                <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">{editId ? 'Salvar Edição' : 'Criar Modelo'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Viewer Modal - Ficha de Observação do Design */}
            {isViewerOpen && viewerDesign && (
                <div className="modal-overlay" onClick={() => setIsViewerOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '800px', width: '95%', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', height: window.innerWidth < 768 ? '85vh' : 'auto' }}>
                            {/* Esquerda: Visualizador */}
                            <div style={{ flex: '1 1 50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: 'var(--space-md)', minHeight: '300px' }}>
                                {viewerDesign.thumbnailUrl ? (
                                    <img src={viewerDesign.thumbnailUrl} alt={viewerDesign.name} style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                ) : (
                                    <div className="text-muted flex flex-col items-center">
                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                        <span>Sem Imagem Previa</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Direita: Info */}
                            <div style={{ flex: '1 1 50%', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflowY: 'auto' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        <span className="badge badge-info uppercase" style={{ fontWeight: 800 }}>{viewerDesign.category}</span>
                                        <span className={`badge uppercase`} style={{ fontWeight: 800, backgroundColor: viewerDesign.status === 'Aprovado' ? 'var(--success)' : 'var(--warning)', color: viewerDesign.status === 'Aprovado' ? '#fff' : '#000' }}>
                                            {viewerDesign.status}
                                        </span>
                                    </div>
                                    <button type="button" className="btn btn-icon text-muted" onClick={() => setIsViewerOpen(false)}><X size={20} /></button>
                                </div>

                                <h2 className="text-2xl font-bold text-[#1e293b] mb-1">{viewerDesign.name}</h2>
                                <p className="text-sm text-muted mb-6">Criado em {new Date(viewerDesign.createdAt).toLocaleDateString('pt-BR')}</p>

                                {viewerDesign.description && (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-muted uppercase block border-b border-border pb-1 mb-2">Características Técnicas</label>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewerDesign.description}</p>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-muted uppercase block border-b border-border pb-1 mb-2">Vínculo Produto/Catálogo</label>
                                    {viewerDesign.productId ? (
                                        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-bold">
                                            <Box size={16} className="text-blue-500" />
                                            {products.find(p => p.id === viewerDesign.productId)?.name || 'Vínculo Perdidio'}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted italic">Modelo solto / Não catalogado em vendas</p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-muted uppercase block border-b border-border pb-1 mb-2">Etiquetas de Pesquisa</label>
                                    <div className="flex flex-wrap gap-2">
                                        {viewerDesign.tags ? viewerDesign.tags.split(',').map((tag, i) => (
                                            <span key={i} className="text-[11px] font-bold text-slate-500 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-full">
                                                #{tag.trim()}
                                            </span>
                                        )) : <p className="text-sm text-muted italic">Sem etiquetas setadas</p>}
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    {viewerDesign.fileUrl && (
                                        <a 
                                            href={viewerDesign.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-primary w-full justify-center flex items-center gap-2"
                                            style={{ padding: '12px' }}
                                        >
                                            <ExternalLink size={18} /> Abrir Link do G-Drive / Original
                                        </a>
                                    )}
                                    <button 
                                        onClick={(e) => { setIsViewerOpen(false); openEdit(viewerDesign, e); }}
                                        className="btn btn-outline w-full justify-center flex items-center gap-2"
                                    >
                                        <Edit2 size={16} /> Editar Propriedades deste Modelo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Categorias Padrão */}
            {isCategoryModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title font-bold flex items-center gap-2">Categorias de Design</h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsCategoryModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input type="text" className="form-input flex-1" required placeholder="Nova tag..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <button type="submit" className="btn btn-primary"><Plus size={16}/></button>
                            </form>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                {rawCategories.filter(c => c.type === 'design').map(c => (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                        <button onClick={() => handleDeleteCategory(c.id, c.name)} className="btn btn-icon text-muted hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {rawCategories.filter(c => c.type === 'design').length === 0 && (
                                    <div className="text-sm text-muted text-center py-4">Nenhuma categoria registrada.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
