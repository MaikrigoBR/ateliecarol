
import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, ExternalLink, Trash2, Search, Tag, FolderOpen } from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';

export function DesignLibrary() {
    const { currentUser } = useAuth();
    const [designs, setDesigns] = useState([]);
    const [filteredDesigns, setFilteredDesigns] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        category: 'Geral', 
        thumbnailUrl: '', 
        fileUrl: '', // Link para o Drive/Dropbox
        tags: '' 
    });

    const fetchDesigns = async () => {
        const all = await db.getAll('designs') || [];
        setDesigns(all);
        setFilteredDesigns(all);
    };

    useEffect(() => {
        fetchDesigns();
    }, []);

    // Filter Logic
    useEffect(() => {
        let results = designs;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(d => 
                d.name.toLowerCase().includes(term) || 
                d.tags?.toLowerCase().includes(term)
            );
        }

        if (filterCategory !== 'Todas') {
            results = results.filter(d => d.category === filterCategory);
        }

        setFilteredDesigns(results);
    }, [searchTerm, filterCategory, designs]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if(!formData.name) return;
        
        await db.create('designs', {
            ...formData,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.email || 'unknown'
        });

        // Reset
        setFormData({ name: '', category: 'Geral', thumbnailUrl: '', fileUrl: '', tags: '' });
        setIsModalOpen(false);
        fetchDesigns();
    };

    const handleDelete = async (id) => {
        if(window.confirm('Tem certeza que deseja excluir este modelo da galeria?')) {
            await db.delete('designs', id);
            fetchDesigns();
        }
    };

    const categories = ['Geral', 'Casamento', 'Corporativo', 'Infantil', 'Datas Comemorativas', 'Promocional'];

    return (
        <div className="animate-fade-in p-xl max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
                <div>
                    <h2 className="text-2xl font-bold mb-xs flex items-center gap-sm">
                        <FolderOpen className="text-primary" /> Galeria de Modelos
                    </h2>
                    <p className="text-muted">Gerencie seu portfólio de designs e links para arquivos originais.</p>
                </div>
                <button className="btn btn-primary shadow-sm hover:translate-y-[-2px] transition-transform" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} className="mr-sm" />
                    Novo Modelo
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-surface p-md rounded-lg shadow-sm border border-border mb-xl flex flex-col md:flex-row gap-md items-center">
                <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou tag..." 
                        className="form-input pl-10 w-full"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-sm w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button 
                        className={`btn btn-sm ${filterCategory === 'Todas' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilterCategory('Todas')}
                    >
                        Todas
                    </button>
                    {categories.slice(1).map(cat => (
                        <button 
                            key={cat}
                            className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setFilterCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
                {filteredDesigns.length === 0 && (
                    <div className="col-span-full py-16 text-center text-muted border-2 border-dashed border-border rounded-xl bg-surface-hover">
                        <div className="flex flex-col items-center">
                            <ImageIcon size={48} className="mb-md opacity-20" />
                            <p>Nenhum modelo encontrado com os filtros atuais.</p>
                            {designs.length === 0 && <p className="text-sm mt-sm">Clique em "Novo Modelo" para começar sua biblioteca!</p>}
                        </div>
                    </div>
                )}
                
                {filteredDesigns.map(design => (
                    <div key={design.id} className="card group hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20 flex flex-col h-full">
                        {/* Image Area */}
                        <div className="relative aspect-video bg-surface-hover overflow-hidden border-b border-border">
                            {design.thumbnailUrl ? (
                                <img 
                                    src={design.thumbnailUrl} 
                                    alt={design.name} 
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                                    onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400?text=Sem+Imagem'; }} 
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                                    <ImageIcon size={32} className="opacity-30 mb-xs" />
                                    <span className="text-xs">Sem prévia</span>
                                </div>
                            )}
                            
                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-sm backdrop-blur-[1px]">
                                {design.fileUrl && (
                                    <a 
                                        href={design.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn btn-sm bg-white text-primary hover:bg-primary hover:text-white border-none shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                        title="Abrir Arquivo Original (Drive/Dropbox)"
                                    >
                                        <ExternalLink size={16} className="mr-xs" /> Abrir Original
                                    </a>
                                )}
                            </div>

                            <button 
                                onClick={() => handleDelete(design.id)}
                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full text-danger opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 hover:text-red-600 z-10"
                                title="Excluir Modelo"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-md flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-xs">
                                <span className="badge badge-neutral text-[10px] uppercase tracking-wider">{design.category}</span>
                            </div>
                            <h3 className="font-bold text-lg text-text-primary mb-xs line-clamp-1" title={design.name}>{design.name}</h3>
                            
                            {design.tags && (
                                <div className="flex flex-wrap gap-xs mt-auto pt-sm">
                                    {design.tags.split(',').map((tag, i) => (
                                        <span key={i} className="text-xs text-muted bg-surface-hover px-1.5 py-0.5 rounded flex items-center">
                                            <Tag size={10} className="mr-1 opacity-50" />
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {!design.fileUrl && (
                                <div className="mt-auto pt-md text-center">
                                    <span className="text-xs text-warning flex items-center justify-center gap-xs bg-warning/10 py-1 rounded">
                                        ⚠️ Sem arquivo linkado
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content animate-slide-up max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <div className="modal-header border-b border-border pb-md mb-md">
                            <h3 className="modal-title flex items-center gap-sm text-xl">
                                <FolderOpen className="text-primary" size={24} /> 
                                Novo Modelo
                            </h3>
                            <button className="btn-icon hover:bg-danger/10 hover:text-danger rounded-full" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="modal-body space-y-md">
                                <div className="grid grid-cols-2 gap-md">
                                    <div className="col-span-2">
                                        <label className="form-label font-medium">Nome do Modelo *</label>
                                        <input 
                                            className="form-input" 
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            required 
                                            placeholder="Ex: Convite Floral 2024"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label font-medium">Categoria</label>
                                        <select 
                                            className="form-input" 
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            {categories.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label font-medium">Tags (separadas por vírgula)</label>
                                        <input 
                                            className="form-input" 
                                            value={formData.tags} 
                                            onChange={e => setFormData({...formData, tags: e.target.value})}
                                            placeholder="Ex: luxo, dourado, verão"
                                        />
                                    </div>
                                </div>

                                <div className="bg-surface-hover p-md rounded-lg border border-border/50">
                                    <label className="form-label font-medium flex items-center gap-xs text-primary">
                                        <ImageIcon size={16} /> URL da Imagem de Capa (Thumbnail)
                                    </label>
                                    <input 
                                        className="form-input mb-xs" 
                                        value={formData.thumbnailUrl} 
                                        onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                                        placeholder="https://i.imgur.com/..."
                                    />
                                    <p className="text-xs text-muted">Use um link público de imagem (Imgur, Pinterest, etc) para visualização rápida.</p>
                                </div>

                                <div className="bg-blue-50/50 p-md rounded-lg border border-blue-100">
                                    <label className="form-label font-medium flex items-center gap-xs text-blue-600">
                                        <ExternalLink size={16} /> Link do Arquivo Original (Drive/Dropbox)
                                    </label>
                                    <input 
                                        className="form-input mb-xs border-blue-200 focus:border-blue-400" 
                                        value={formData.fileUrl} 
                                        onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                    />
                                    <p className="text-xs text-blue-600/70">Cole o link da pasta ou arquivo editável onde está salvo.</p>
                                </div>
                            </div>
                            <div className="modal-footer pt-md border-t border-border mt-md">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary px-lg">Salvar Modelo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
