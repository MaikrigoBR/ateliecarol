import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Link as LinkIcon, Type, Image as ImageIcon } from 'lucide-react';
import { PromoBanner } from './PromoBanner';

export function PromoBannerModal({ isOpen, onClose, bannerConfig, onSave, companyConfig }) {
    const [config, setConfig] = useState({
        active: true,
        title: 'Acompanhe nossa Mágica!',
        text: 'Enquanto espera, siga nosso Instagram e marque-nos quando seu pedido chegar!',
        bgStyle: 'instagram',
        bgColor: '#E1306C',
        textColor: '#ffffff',
        icon: 'instagram',
        link: ''
    });

    useEffect(() => {
        if (bannerConfig) {
            setConfig(prev => ({ ...prev, ...bannerConfig }));
        }
    }, [bannerConfig, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                <div className="modal-header border-b px-6 py-4">
                    <h2 className="modal-title flex items-center gap-2">
                        <Palette size={20} className="text-primary" /> Configurador de Banner
                    </h2>
                    <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body p-6 flex flex-col gap-6" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {/* LIVE PREVIEW */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-2 left-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview ao Vivo da Proposta/Rastreio</div>
                        <div className="mt-4 pointer-events-none">
                            <PromoBanner promoConfig={config} companyConfig={companyConfig} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* TEXT SETTINGS */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Type size={16}/> Conteúdo da Chamada</h3>
                            
                            <div className="input-group">
                                <label className="form-label">Título Principal <span className="text-xs text-gray-400 font-normal">({config.title.length}/40)</span></label>
                                <input 
                                    type="text" 
                                    className="form-input font-bold" 
                                    maxLength="40"
                                    value={config.title}
                                    onChange={e => handleChange('title', e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="form-label">Texto da Mensagem <span className="text-xs text-gray-400 font-normal">({config.text.length}/120)</span></label>
                                <textarea 
                                    className="form-input text-sm" 
                                    rows="3"
                                    maxLength="120"
                                    value={config.text}
                                    onChange={e => handleChange('text', e.target.value)}
                                    placeholder="Convide o cliente para alguma ação..."
                                ></textarea>
                            </div>

                            <div className="input-group">
                                <label className="form-label flex items-center gap-1"><LinkIcon size={14} /> Link de Destino</label>
                                <input 
                                    type="url" 
                                    className="form-input text-sm" 
                                    value={config.link}
                                    onChange={e => handleChange('link', e.target.value)}
                                    placeholder="Deixe vazio para usar o @ do ateliê"
                                />
                            </div>
                        </div>

                        {/* VISUAL SETTINGS */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><ImageIcon size={16}/> Estilo Visual</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="input-group">
                                    <label className="form-label">Estilo de Fundo</label>
                                    <select 
                                        className="form-input text-sm"
                                        value={config.bgStyle}
                                        onChange={e => handleChange('bgStyle', e.target.value)}
                                    >
                                        <option value="instagram">Gradiente Instagram</option>
                                        <option value="solid">Cor Sólida (Hex)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Ícone</label>
                                    <select 
                                        className="form-input text-sm"
                                        value={config.icon}
                                        onChange={e => handleChange('icon', e.target.value)}
                                    >
                                        <option value="instagram">Instagram</option>
                                        <option value="gift">Presente</option>
                                        <option value="star">Estrela</option>
                                        <option value="megaphone">Megafone</option>
                                        <option value="heart">Coração</option>
                                    </select>
                                </div>
                            </div>

                            {config.bgStyle === 'solid' && (
                                <div className="input-group animate-fade-in">
                                    <label className="form-label">Cor de Fundo Sólida</label>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="color" 
                                            className="h-10 w-12 cursor-pointer border-0 rounded p-0" 
                                            value={config.bgColor}
                                            onChange={e => handleChange('bgColor', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            className="form-input font-mono uppercase text-sm" 
                                            value={config.bgColor}
                                            onChange={e => handleChange('bgColor', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="input-group">
                                <label className="form-label">Cor do Texto</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="color" 
                                        className="h-10 w-12 cursor-pointer border-0 rounded p-0" 
                                        value={config.textColor}
                                        onChange={e => handleChange('textColor', e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        className="form-input font-mono uppercase text-sm" 
                                        value={config.textColor}
                                        onChange={e => handleChange('textColor', e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={config.active} onChange={e => handleChange('active', e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <label className="text-sm font-bold text-gray-700 select-none cursor-pointer flex-1 cursor-pointer">
                                    {config.active ? 'Banner Ativo e Visível' : 'Banner Oculto nas Telas'}
                                </label>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="modal-footer px-6 py-4 bg-white border-t flex justify-end gap-3 rounded-b-xl">
                    <button className="btn btn-secondary px-6" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary px-8 flex items-center gap-2" onClick={handleSave}>
                        <Save size={16} /> Salvar Banner
                    </button>
                </div>
            </div>
        </div>
    );
}
