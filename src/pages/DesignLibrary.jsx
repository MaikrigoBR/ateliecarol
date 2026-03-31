import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Image as ImageIcon, ExternalLink, Trash2, Search, Edit2, X, Palette, Box, Settings, CheckCircle, Tag, Upload, LayoutGrid, List, ChevronDown } from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import AuditService from '../services/AuditService';

// ── Auto thumbnail for Google Drive links ─────────────────────────────────────
const getAutoThumbnail = (url) => {
    if (!url) return '';
    if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return url;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch?.[1]) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    if (urlParams.get('id')) return `https://drive.google.com/thumbnail?id=${urlParams.get('id')}&sz=w800`;
    return '';
};

// ── Image compression (same pattern as NewProductModal) ───────────────────────
const compressImage = (file, maxWH = 800, quality = 0.78) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWH || height > maxWH) {
                if (width > height) { height = Math.round((height / width) * maxWH); width = maxWH; }
                else { width = Math.round((width / height) * maxWH); height = maxWH; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            const b64 = canvas.toDataURL('image/jpeg', quality);
            resolve(b64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// ── Palette of colours a user can assign to a category ───────────────────────
const CAT_COLORS = [
    { label: 'Violeta', value: '#7c3aed' },
    { label: 'Azul', value: '#2563eb' },
    { label: 'Verde', value: '#16a34a' },
    { label: 'Rosa', value: '#db2777' },
    { label: 'Laranja', value: '#ea580c' },
    { label: 'Âmbar', value: '#d97706' },
    { label: 'Ciano', value: '#0891b2' },
    { label: 'Índigo', value: '#4f46e5' },
    { label: 'Cinza', value: '#475569' },
];

// ── Status badge colour map ────────────────────────────────────────────────────
const STATUS_STYLE = {
    'Aprovado': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    'Pendente': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    'Rascunho': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

// ── Inline Category Chip ───────────────────────────────────────────────────────
function CatChip({ name, color, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 14px', borderRadius: '20px', border: `2px solid ${active ? color : 'transparent'}`,
                backgroundColor: active ? color + '18' : 'var(--background, #f8fafc)',
                color: active ? color : 'var(--text-muted, #64748b)',
                fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
            }}
        >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
            {name}
        </button>
    );
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  MAIN COMPONENT
// ╚══════════════════════════════════════════════════════════════════════════════
export function DesignLibrary() {
    const { currentUser } = useAuth();

    // ── Data state ────────────────────────────────────────────────────────────
    const [designs, setDesigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [rawCategories, setRawCategories] = useState([]);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [filterProduct, setFilterProduct] = useState('Todos');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // ── Design modal ──────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: 'Geral', thumbnailUrl: '', imageBase64: '',
        fileUrl: '', tags: '', productId: '', description: '', status: 'Aprovado'
    });
    const [thumbPreview, setThumbPreview] = useState('');
    const [isUploadingThumb, setIsUploadingThumb] = useState(false);

    // ── Viewer modal ──────────────────────────────────────────────────────────
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerDesign, setViewerDesign] = useState(null);

    // ── Category management modal ─────────────────────────────────────────────
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#7c3aed');
    const [editingCat, setEditingCat] = useState(null); // { id, name, color }

    // ── Derived ───────────────────────────────────────────────────────────────
    const designCats = useMemo(() => rawCategories.filter(c => c.type === 'design'), [rawCategories]);
    const catMap = useMemo(() => {
        const m = {};
        designCats.forEach(c => { m[c.name] = c.color || '#7c3aed'; });
        return m;
    }, [designCats]);

    const filteredDesigns = useMemo(() => {
        let r = designs;
        if (searchTerm) {
            const t = searchTerm.toLowerCase();
            r = r.filter(d => d.name?.toLowerCase().includes(t) || d.tags?.toLowerCase().includes(t) || d.description?.toLowerCase().includes(t));
        }
        if (filterCategory !== 'Todas') r = r.filter(d => d.category === filterCategory);
        if (filterProduct !== 'Todos') r = r.filter(d => String(d.productId) === String(filterProduct));
        return r;
    }, [designs, searchTerm, filterCategory, filterProduct]);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = async () => {
        const [allDesigns, allProducts, allCategories] = await Promise.all([
            db.getAll('designs'),
            db.getAll('products'),
            db.getAll('categories'),
        ]);

        let cats = (allCategories || []);
        const designCats = cats.filter(c => c.type === 'design');
        if (designCats.length === 0) {
            const defaults = [
                { name: 'Geral', color: '#475569' },
                { name: 'Casamento', color: '#db2777' },
                { name: 'Corporativo', color: '#2563eb' },
                { name: 'Sazonal', color: '#ea580c' },
                { name: 'Identidade Visual', color: '#7c3aed' },
            ];
            await Promise.all(defaults.map(d => db.create('categories', { ...d, type: 'design' })));
            cats = await db.getAll('categories') || [];
        }

        setRawCategories(cats);
        setProducts((allProducts || []).sort((a, b) => a.name.localeCompare(b.name)));
        setDesigns((allDesigns || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    };

    useEffect(() => { fetchData(); }, []);

    // ── Thumbnail upload ──────────────────────────────────────────────────────
    const handleThumbUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingThumb(true);
        try {
            const b64 = await compressImage(file, 600, 0.80);
            setFormData(prev => ({ ...prev, imageBase64: b64, thumbnailUrl: '' }));
            setThumbPreview(b64);
        } finally { setIsUploadingThumb(false); }
    };

    // ── Thumbnail URL change ──────────────────────────────────────────────────
    const handleThumbUrlChange = (url) => {
        setFormData(prev => ({ ...prev, thumbnailUrl: url, imageBase64: '' }));
        setThumbPreview(getAutoThumbnail(url) || url);
    };

    // ── Save design ───────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        // Resolve thumbnail: prefer uploaded Base64, then URL (auto-resolve Drive), then existing
        let finalThumb = formData.imageBase64 || formData.thumbnailUrl;
        if (!finalThumb && formData.fileUrl) finalThumb = getAutoThumbnail(formData.fileUrl);

        const payload = { ...formData, thumbnailUrl: formData.imageBase64 ? '' : finalThumb, imageBase64: formData.imageBase64 };

        if (editId) {
            payload.updatedAt = new Date().toISOString();
            await db.update('designs', editId, payload);
            AuditService.log(currentUser, 'UPDATE', 'Designs', editId, `Atualizou modelo: ${payload.name}`);
        } else {
            payload.createdAt = new Date().toISOString();
            payload.createdBy = currentUser?.email || 'unknown';
            const res = await db.create('designs', payload);
            AuditService.log(currentUser, 'CREATE', 'Designs', res?.id, `Criou novo modelo: ${payload.name}`);
        }
        closeModal();
        fetchData();
    };

    const handleDelete = async (id, name, e) => {
        e?.stopPropagation();
        if (window.confirm(`Excluir permanentemente o modelo: ${name}?`)) {
            await db.delete('designs', id);
            AuditService.log(currentUser, 'DELETE', 'Designs', id, `Excluiu modelo: ${name}`);
            fetchData();
            setIsViewerOpen(false);
        }
    };

    const openEdit = (design, e) => {
        e?.stopPropagation();
        setFormData({
            name: design.name || '', category: design.category || 'Geral',
            thumbnailUrl: design.thumbnailUrl || '', imageBase64: design.imageBase64 || '',
            fileUrl: design.fileUrl || '', tags: design.tags || '',
            productId: design.productId || '', description: design.description || '',
            status: design.status || 'Aprovado',
        });
        setThumbPreview(design.imageBase64 || design.thumbnailUrl || '');
        setEditId(design.id);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditId(null);
        setThumbPreview('');
        setFormData({ name: '', category: 'Geral', thumbnailUrl: '', imageBase64: '', fileUrl: '', tags: '', productId: '', description: '', status: 'Aprovado' });
    };

    // ── Category CRUD ─────────────────────────────────────────────────────────
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        await db.create('categories', { name: newCategoryName.trim(), type: 'design', color: newCategoryColor });
        setNewCategoryName('');
        setNewCategoryColor('#7c3aed');
        fetchData();
    };

    const handleSaveEditCat = async () => {
        if (!editingCat || !editingCat.name.trim()) return;
        await db.update('categories', editingCat.id, { name: editingCat.name.trim(), color: editingCat.color });
        setEditingCat(null);
        fetchData();
    };

    const handleDeleteCategory = async (id, name) => {
        if (window.confirm(`Excluir a categoria "${name}"? Os modelos desta categoria não serão excluídos.`)) {
            await db.delete('categories', id);
            fetchData();
        }
    };

    // ── Thumbnail helper for card ─────────────────────────────────────────────
    const getCardThumb = (d) => d.imageBase64 || d.thumbnailUrl || '';

    // ════════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════════
    return (
        <div className="animate-fade-in">

            {/* ── PAGE HEADER ── */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 className="title">Galeria de Modelos</h2>
                    <p className="text-muted">Gerencie artes, moldes e designs vinculados aos produtos.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)', backgroundColor: 'var(--surface, white)', color: 'var(--text-muted, #64748b)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                        <Settings size={15} /> Categorias
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => { closeModal(); setIsModalOpen(true); }}
                    >
                        <Plus size={16} /> Novo Modelo
                    </button>
                </div>
            </div>

            {/* ── CATEGORY CHIPS ── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                <CatChip name="Todas" color="#475569" active={filterCategory === 'Todas'} onClick={() => setFilterCategory('Todas')} />
                {designCats.map(c => (
                    <CatChip key={c.id} name={c.name} color={c.color || '#7c3aed'} active={filterCategory === c.name} onClick={() => setFilterCategory(c.name)} />
                ))}
            </div>

            {/* ── SEARCH + FILTERS ROW ── */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar por nome, tag..."
                        style={{ paddingLeft: '32px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="form-input"
                    style={{ minWidth: '180px', backgroundColor: 'var(--surface)' }}
                    value={filterProduct}
                    onChange={e => setFilterProduct(e.target.value)}
                >
                    <option value="Todos">Todos os Produtos</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {/* Grid / List toggle */}
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', background: viewMode === 'grid' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Grid">
                        <LayoutGrid size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', background: viewMode === 'list' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Lista">
                        <List size={16} />
                    </button>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredDesigns.length} modelo{filteredDesigns.length !== 1 ? 's' : ''}</span>
            </div>

            {/* ── GRID VIEW ── */}
            {viewMode === 'grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {filteredDesigns.map(design => {
                        const catColor = catMap[design.category] || '#7c3aed';
                        const thumb = getCardThumb(design);
                        const statusSt = STATUS_STYLE[design.status] || STATUS_STYLE['Rascunho'];
                        return (
                            <div
                                key={design.id}
                                onClick={() => { setViewerDesign(design); setIsViewerOpen(true); }}
                                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                            >
                                {/* Color bar */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: catColor }} />

                                {/* Thumb */}
                                <div style={{ height: '160px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {thumb ? (
                                        <img src={thumb} alt={design.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <ImageIcon size={40} style={{ color: '#cbd5e1' }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3, flex: 1, marginRight: '6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {design.name}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', backgroundColor: catColor + '15', color: catColor, fontSize: '0.7rem', fontWeight: 700 }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: catColor }} />
                                            {design.category}
                                        </span>
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: statusSt.bg, color: statusSt.color, border: `1px solid ${statusSt.border}` }}>
                                            {design.status}
                                        </span>
                                        {design.productId && (
                                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                                Vinculado
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {design.tags && (
                                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {design.tags.split(',').slice(0, 3).map((tag, i) => (
                                                <span key={i} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', backgroundColor: 'var(--background, #f8fafc)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: '6px' }}>
                                                    #{tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick actions */}
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border, #f1f5f9)' }}
                                        onClick={e => e.stopPropagation()}>
                                        <button onClick={(e) => openEdit(design, e)} title="Editar" style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, gap: '4px' }}>
                                            <Edit2 size={12} /> Editar
                                        </button>
                                        {design.fileUrl && (
                                            <button onClick={() => window.open(design.fileUrl, '_blank')} title="Abrir fonte" style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <ExternalLink size={12} />
                                            </button>
                                        )}
                                        <button onClick={(e) => handleDelete(design.id, design.name, e)} title="Excluir" style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredDesigns.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                            <ImageIcon size={48} style={{ marginBottom: '12px', opacity: 0.25 }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>Nenhum modelo encontrado.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '56px' }}>Prévia</th>
                                    <th>Nome</th>
                                    <th>Categoria</th>
                                    <th>Status</th>
                                    <th>Produto</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDesigns.map(design => {
                                    const catColor = catMap[design.category] || '#7c3aed';
                                    const thumb = getCardThumb(design);
                                    const statusSt = STATUS_STYLE[design.status] || STATUS_STYLE['Rascunho'];
                                    return (
                                        <tr key={design.id} style={{ cursor: 'pointer' }} onClick={() => { setViewerDesign(design); setIsViewerOpen(true); }}>
                                            <td>
                                                {thumb ? (
                                                    <img src={thumb} alt={design.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                                ) : (
                                                    <div style={{ width: '44px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ImageIcon size={18} style={{ color: '#cbd5e1' }} />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{design.name}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', backgroundColor: catColor + '15', color: catColor, fontSize: '0.75rem', fontWeight: 700 }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: catColor }} />
                                                    {design.category}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: statusSt.bg, color: statusSt.color }}>
                                                    {design.status}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                {design.productId ? (products.find(p => String(p.id) === String(design.productId))?.name || '—') : '—'}
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-icon" onClick={e => openEdit(design, e)} style={{ color: 'var(--primary)' }}><Edit2 size={15} /></button>
                                                    {design.fileUrl && <button className="btn btn-icon" onClick={() => window.open(design.fileUrl, '_blank')}><ExternalLink size={15} /></button>}
                                                    <button className="btn btn-icon" onClick={e => handleDelete(design.id, design.name, e)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredDesigns.length === 0 && (
                                    <tr><td colSpan="6" className="text-center p-4 text-muted">Nenhum modelo encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════ DESIGN FORM MODAL ══════════════════════ */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={closeModal}>
                    <div style={{ backgroundColor: 'var(--surface)', borderRadius: '18px', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--primary, #7c3aed), #9333ea)', color: 'white' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                                {editId ? '✏️ Editar Modelo' : '🎨 Novo Modelo'}
                            </h2>
                            <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: 'white', padding: '6px', cursor: 'pointer', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Nome / Identificação *</label>
                                <input type="text" className="form-input" required autoFocus placeholder="Ex: Arte Convite Floral Casamento 2024" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            {/* Category + Status */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Categoria</label>
                                    <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {designCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Status</label>
                                    <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Aprovado">Final / Aprovado</option>
                                        <option value="Pendente">Aguardando Avaliação</option>
                                        <option value="Rascunho">Rascunho</option>
                                    </select>
                                </div>
                            </div>

                            {/* Product link */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Vínculo com Produto</label>
                                <select className="form-input" value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value })}>
                                    <option value="">(Nenhum produto associado)</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            {/* Thumbnail upload OR URL */}
                            <div style={{ backgroundColor: 'var(--background, #f8fafc)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                    Miniatura / Prévia
                                </label>

                                {/* Preview */}
                                {thumbPreview && (
                                    <div style={{ marginBottom: '12px', position: 'relative', display: 'inline-block' }}>
                                        <img src={thumbPreview} alt="Prévia" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--primary)' }} />
                                        <button type="button" onClick={() => { setThumbPreview(''); setFormData(prev => ({ ...prev, thumbnailUrl: '', imageBase64: '' })); }}
                                            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#ef4444', border: '2px solid white', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                            <X size={11} />
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                                        <Upload size={14} /> {isUploadingThumb ? 'Carregando...' : 'Enviar Imagem'}
                                        <input type="file" accept="image/*" onChange={handleThumbUpload} style={{ display: 'none' }} />
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ou cole uma URL:</span>
                                    <input type="text" className="form-input" placeholder="https://..." value={formData.imageBase64 ? '' : formData.thumbnailUrl} onChange={e => handleThumbUrlChange(e.target.value)} style={{ flex: 1, minWidth: '160px' }} disabled={!!formData.imageBase64} />
                                </div>
                            </div>

                            {/* File URL */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>URL do Arquivo Fonte (Drive / Canva)</label>
                                <input type="text" className="form-input" placeholder="Cole o link do arquivo original..." value={formData.fileUrl} onChange={e => setFormData({ ...formData, fileUrl: e.target.value })} />
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Links do Google Drive geram thumbnail automático.</div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Tags (separadas por vírgula)</label>
                                <input type="text" className="form-input" placeholder="Ex: mockup, floral, cliente vip" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Observações Técnicas</label>
                                <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Fonte usada, margens de sangria, camadas..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Salvar Edição' : 'Criar Modelo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════ VIEWER MODAL ══════════════════ */}
            {isViewerOpen && viewerDesign && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setIsViewerOpen(false)}>
                    <div style={{ backgroundColor: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '92vh', display: 'flex', overflow: 'hidden', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
                        {/* Left: Image */}
                        <div style={{ flex: '1 1 50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', minHeight: '300px' }}>
                            {getCardThumb(viewerDesign) ? (
                                <img src={getCardThumb(viewerDesign)} alt={viewerDesign.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
                                    <ImageIcon size={56} />
                                    <span style={{ fontSize: '0.85rem' }}>Sem prévia</span>
                                </div>
                            )}
                        </div>

                        {/* Right: Info */}
                        <div style={{ flex: '1 1 50%', padding: '28px', display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '92vh' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(() => {
                                        const catColor = catMap[viewerDesign.category] || '#7c3aed';
                                        const statusSt = STATUS_STYLE[viewerDesign.status] || STATUS_STYLE['Rascunho'];
                                        return (
                                            <>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '20px', backgroundColor: catColor + '18', color: catColor, fontSize: '0.75rem', fontWeight: 700 }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: catColor }} />
                                                    {viewerDesign.category}
                                                </span>
                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: statusSt.bg, color: statusSt.color }}>
                                                    {viewerDesign.status}
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                                <button onClick={() => setIsViewerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>{viewerDesign.name}</h2>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
                                Criado em {viewerDesign.createdAt ? new Date(viewerDesign.createdAt).toLocaleDateString('pt-BR') : '—'}
                            </p>

                            {viewerDesign.description && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>Observações Técnicas</div>
                                    <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{viewerDesign.description}</p>
                                </div>
                            )}

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>Produto Associado</div>
                                {viewerDesign.productId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, color: '#1d4ed8' }}>
                                        <Box size={16} /> {products.find(p => String(p.id) === String(viewerDesign.productId))?.name || 'Produto não encontrado'}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Não associado a nenhum produto.</p>
                                )}
                            </div>

                            {viewerDesign.tags && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>Tags</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {viewerDesign.tags.split(',').map((tag, i) => (
                                            <span key={i} style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                #{tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {viewerDesign.fileUrl && (
                                    <a href={viewerDesign.fileUrl} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>
                                        <ExternalLink size={16} /> Abrir Arquivo Original
                                    </a>
                                )}
                                <button onClick={(e) => { setIsViewerOpen(false); openEdit(viewerDesign, e); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                                    <Edit2 size={16} /> Editar Propriedades
                                </button>
                                <button onClick={(e) => handleDelete(viewerDesign.id, viewerDesign.name, e)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: '1px solid #fca5a5', backgroundColor: 'white', color: '#dc2626', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                                    <Trash2 size={16} /> Excluir Modelo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ CATEGORY MANAGEMENT MODAL ══════════════════ */}
            {isCategoryModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setIsCategoryModalOpen(false)}>
                    <div style={{ backgroundColor: 'var(--surface)', borderRadius: '18px', width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag size={18} color="var(--primary)" /> Gerenciar Categorias
                            </h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {/* Add new */}
                            <form onSubmit={handleCreateCategory} style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Nova Categoria</div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input type="text" className="form-input" required placeholder="Nome da categoria..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} style={{ flex: 1 }} />
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        {CAT_COLORS.map(c => (
                                            <button key={c.value} type="button" title={c.label} onClick={() => setNewCategoryColor(c.value)}
                                                style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: c.value, border: newCategoryColor === c.value ? '3px solid var(--text-main)' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                                        ))}
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0, padding: '8px 14px' }}>
                                        <Plus size={15} />
                                    </button>
                                </div>
                            </form>

                            {/* List */}
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                                Categorias Existentes ({designCats.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {designCats.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: 'var(--background, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        {editingCat?.id === c.id ? (
                                            <>
                                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: editingCat.color, flexShrink: 0 }} />
                                                <input
                                                    type="text"
                                                    value={editingCat.name}
                                                    onChange={e => setEditingCat(prev => ({ ...prev, name: e.target.value }))}
                                                    style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'white' }}
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                                    {CAT_COLORS.map(col => (
                                                        <button key={col.value} type="button" title={col.label} onClick={() => setEditingCat(prev => ({ ...prev, color: col.value }))}
                                                            style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: col.value, border: editingCat.color === col.value ? '2px solid var(--text-main)' : '1px solid transparent', cursor: 'pointer', padding: 0 }} />
                                                    ))}
                                                </div>
                                                <button onClick={handleSaveEditCat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', padding: '2px' }}><CheckCircle size={18} /></button>
                                                <button onClick={() => setEditingCat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color || '#7c3aed', flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{c.name}</span>
                                                <button onClick={() => setEditingCat({ id: c.id, name: c.name, color: c.color || '#7c3aed' })}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }} title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteCategory(c.id, c.name)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Excluir">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {designCats.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma categoria cadastrada.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
