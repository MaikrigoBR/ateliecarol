import React, { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Info, PieChart, Activity } from 'lucide-react';

export function DreReport({ transactions }) {
    const [regime, setRegime] = useState('caixa'); // caixa ou competencia

    const dreData = useMemo(() => {
        // Filtra pelo regime
        const filtered = transactions.filter(t => {
            if (regime === 'caixa') return t.status === 'paid';
            return true; // Competência aceita pending
        });

        // Agrupadores Iniciais
        let recOperacional = 0; // Vendas
        let deducoes = 0; // Impostos
        let cmv = 0; // Custos Variáveis
        let despesasFixas = 0; // OPEX Fixos
        let outrasReceitas = 0; // Não operacionais
        let aportesSociais = 0; // Injeção de Sócios e Empréstimos

        filtered.forEach(t => {
            const val = Number(t.amount) || 0;
            if (t.type === 'income') {
                if (['Vendas de Produtos', 'Serviços Prestados'].includes(t.category)) {
                    recOperacional += val;
                } else if (['Aporte de Sócios / Empréstimo'].includes(t.category)) {
                    aportesSociais += val;
                } else {
                    outrasReceitas += val;
                }
            } else { // expense
                if (['Impostos & Taxas'].includes(t.category)) {
                    deducoes += val;
                } else if (['Materiais & Insumos', 'Logística & Frete'].includes(t.category)) {
                    cmv += val;
                } else { // Administrativo, Pessoal, Marketing, Equipamentos, Outros
                    despesasFixas += val;
                }
            }
        });

        const recLiquida = recOperacional - deducoes;
        const margemContribuicao = recLiquida - cmv;
        const lucroLiquido = margemContribuicao - despesasFixas + outrasReceitas;

        return {
            recOperacional, deducoes, recLiquida, cmv, margemContribuicao, despesasFixas, outrasReceitas, aportesSociais, lucroLiquido
        };
    }, [transactions, regime]);

    const formatBRL = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPct = (val, base) => {
        if (!base || base === 0) return '0.0%';
        return `${((val / base) * 100).toFixed(1)}%`;
    };

    const isProfit = dreData.lucroLiquido >= 0;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-fade-in relative">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="text-indigo-600" size={20} />
                        DRE <span className="text-gray-400 font-normal">| Demonstrativo de Resultado</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1">
                        <Info size={12}/> Visualize sua verdadeira lucratividade
                    </p>
                </div>

                <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setRegime('caixa')}
                        className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md transition-all ${regime === 'caixa' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Regime de Caixa
                    </button>
                    <button 
                        onClick={() => setRegime('competencia')}
                        className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md transition-all ${regime === 'competencia' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        title="Inclui promessas de pagamento (Pendentes)"
                    >
                        Competência
                    </button>
                </div>
            </div>

            <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Linha do Demonstrativo</th>
                            <th className="px-6 py-4 text-right border-l border-gray-100 w-48">Valor</th>
                            <th className="px-6 py-4 text-right border-l border-gray-100 w-32">Análise Vertical (AV%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                        {/* 1. Receita Operacional */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-bold flex items-center gap-2 relative">
                                    1. Receita Operacional Bruta
                                    <span className="absolute -left-4 w-2 h-2 rounded-full bg-blue-500"></span>
                                </span>
                                <span className="text-xs text-gray-400 block mt-0.5 ml-0">Vendas de Serviços e Produtos</span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{formatBRL(dreData.recOperacional)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{formatPct(dreData.recOperacional, dreData.recOperacional)}</td>
                        </tr>

                        {/* 2. Deduções */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-medium text-red-600 flex items-center gap-2 relative">
                                    <TrendingDown size={14}/> 2. (-) Deduções e Impostos
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-red-600 font-medium">-{formatBRL(dreData.deducoes)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{formatPct(dreData.deducoes, dreData.recOperacional)}</td>
                        </tr>

                        {/* 3. Receita Liquida */}
                        <tr className="bg-gray-50/80 font-bold border-t-2 border-gray-200">
                            <td className="px-6 py-4 tracking-wide text-gray-900">= 3. Receita Operacional Líquida</td>
                            <td className="px-6 py-4 text-right">{formatBRL(dreData.recLiquida)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{formatPct(dreData.recLiquida, dreData.recOperacional)}</td>
                        </tr>

                        {/* 4. Custos Variáveis */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-medium text-orange-600 flex items-center gap-2 relative">
                                    <TrendingDown size={14}/> 4. (-) Custos Variáveis (CMV / Insumos)
                                </span>
                                <span className="text-xs text-gray-400 block mt-0.5 ml-6">Materiais, Insumos, Custo de Entregas</span>
                            </td>
                            <td className="px-6 py-4 text-right text-orange-600 font-medium">-{formatBRL(dreData.cmv)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{formatPct(dreData.cmv, dreData.recOperacional)}</td>
                        </tr>

                        {/* 5. Margem de Contribuição */}
                        <tr className="bg-emerald-50/30 text-emerald-900 font-bold border-t-2 border-emerald-100">
                            <td className="px-6 py-4 tracking-wide">= 5. Margem de Contribuição (Lucro Bruto)</td>
                            <td className="px-6 py-4 text-right text-emerald-700">{formatBRL(dreData.margemContribuicao)}</td>
                            <td className="px-6 py-4 text-right text-emerald-600/70 font-mono text-xs">{formatPct(dreData.margemContribuicao, dreData.recOperacional)}</td>
                        </tr>

                        {/* 6. Despesas Operacionais (Fixas) */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-medium text-red-600 flex items-center gap-2 relative">
                                    <TrendingDown size={14}/> 6. (-) Despesas Operacionais Fixas / OPEX
                                </span>
                                <span className="text-xs text-gray-400 block mt-0.5 ml-6">Admin, Marketing, Equipamentos, Tarifa Limpa, Pessoal</span>
                            </td>
                            <td className="px-6 py-4 text-right text-red-600 font-medium">-{formatBRL(dreData.despesasFixas)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{formatPct(dreData.despesasFixas, dreData.recOperacional)}</td>
                        </tr>

                         {/* 7. Outras Receitas */}
                         <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-medium text-indigo-600 flex items-center gap-2 relative">
                                    <TrendingUp size={14}/> 7. (+) Outras Receitas / Rendimentos
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-indigo-600 font-medium">+{formatBRL(dreData.outrasReceitas)}</td>
                            <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">-</td>
                        </tr>

                        {/* 8. RESULTADO FINAL */}
                        <tr className={`font-black text-lg border-t-[3px] ${isProfit ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
                            <td className="px-6 py-6 tracking-wide flex items-center gap-3">
                                {isProfit ? <TrendingUp size={24}/> : <TrendingDown size={24}/>}
                                = RESULTADO LÍQUIDO DO EXERCÍCIO
                            </td>
                            <td className="px-6 py-6 text-right text-xl">{formatBRL(dreData.lucroLiquido)}</td>
                            <td className={`px-6 py-6 text-right font-mono text-sm ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(dreData.lucroLiquido, dreData.recOperacional)}</td>
                        </tr>

                        {/* 9. Aportes / Fluxos de Caixa Não-Operacionais (Extra DRE) */}
                        {dreData.aportesSociais > 0 && (
                            <tr className="bg-sky-50/50 border-t-2 border-dashed border-sky-100">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-sky-700 flex items-center gap-2 relative">
                                        <TrendingUp size={14}/> 9. Aporte de Sócios / Empréstimos Bancários
                                    </span>
                                    <span className="text-[10px] text-sky-600/70 block mt-0.5 font-bold uppercase tracking-wider">
                                        Dinheiro Injetado no caixa: NÃO contabilizado como Lucro
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sky-700 font-bold border-l border-sky-100">+{formatBRL(dreData.aportesSociais)}</td>
                                <td className="px-6 py-4 text-right text-sky-600/50 font-mono text-xs border-l border-sky-100">-</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100 flex items-center justify-center gap-2">
                <Info size={14}/>
                Regime de {regime === 'caixa' ? 'Caixa: Considera apenas montantes efetivamente pagos/recebidos no período selecionado.' : 'Competência: Considera o fato gerador, incluindo valores parcelados ou ainda não pagos pelo cliente.'}
            </div>
        </div>
    );
}
