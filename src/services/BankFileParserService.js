/**
 * BankFileParserService.js
 * Modern engine for interpreting banking exports (OFX, CSV) and 
 * mapping them to the application's financial schema with anti-duplication logic.
 */

const AUTO_CAT_RULES = [
    { pattern: /iof|tar|tarif|imposto|irrf|mora|encargo/i, category: 'Impostos & Taxas', type: 'expense' },
    { pattern: /vivo|claro|tim|enel|sabesp|comgas|aluguel|condominio|internet|wifi/i, category: 'Administrativo / Fixos', type: 'expense' },
    { pattern: /uber|posto|combustivel|gasol|shell|ipiranga|estacionamento/i, category: 'Logística & Frete', type: 'expense' },
    { pattern: /ALUGUEL/i, category: 'Administrativo / Fixos' },
    { pattern: /(PIX|TED|DOC|TRANSFER[EÊ]NCIA|TRANSF\.)/i, category: 'Outros' },
    { pattern: /facebook|google|ads|marketing|instagram|impulsionamento/i, category: 'Marketing & Vendas', type: 'expense' },
    { pattern: /salario|pro-labore|fgts|inss|ferias|decimo/i, category: 'Pessoal & RH', type: 'expense' },
    { pattern: /pagamento.*fatura|liquid.*fatura|pagemante.*fatura|nubank.*pagamento|pago.*cartao/i, category: 'Pagamento de Fatura', type: 'expense' },
    { pattern: /pix.*recebido|venda|pagamento.*recebido|recebimento|loja|ecommerce/i, category: 'Vendas de Produtos', type: 'income' },
    { pattern: /aplicacao|rendimento|cbd|cdi|investimento|resgate/i, category: 'Aportes / Rendimentos', type: 'income' },
    { pattern: /mercado.*livre|mercadolivre|ml-.*|meli/i, category: 'Materiais & Insumos', type: 'expense' },
    { pattern: /mercado.*pago|mercadopago/i, category: 'Impostos & Taxas', type: 'expense' },
    { pattern: /software|assinatura|cloud|digitalocean|aws|microsoft|adobe/i, category: 'Administrativo / Fixos', type: 'expense' },
    { pattern: /ferramenta|papelaria|embalagem|caixa|fita|adesivo/i, category: 'Materiais & Insumos', type: 'expense' },
];

export const BankFileParserService = {
    /**
     * Calcula o mês de fatura baseado na data do lançamento e no fechamento.
     */
    getInvoiceMonth: (dateStr, closeDay) => {
        if (!dateStr || typeof dateStr !== 'string') return new Date();
        const parts = dateStr.split('-');
        if (parts.length < 3) return new Date();
        
        const [y, m, d] = parts.map(Number);
        const normalizedCloseDay = Number(closeDay) || 3;
        
        // Se o dia da compra for maior ou igual ao dia de fechamento, a conta vai para o próximo mês
        if (d >= normalizedCloseDay) {
            return new Date(y, m, 1);
        }
        return new Date(y, m - 1, 1);
    },

    /**
     * Parse OFX content (very simple XML approach for common bank patterns)
     */
    parseOFX: (content, account) => {
        const transactions = [];
        // More robust multi-line OR single-line tag support using lookahead/lookbehind
        const stmTrnMatches = content.split(/<STMTTRN>/i).slice(1);
        const accountId = account?.id || 'default';

        if (!stmTrnMatches) return [];

        stmTrnMatches.forEach(block => {
            const getTag = (tag) => {
                const regex = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i');
                const match = block.match(regex);
                return match ? match[1].trim() : null;
            };

            const trnType = getTag('TRNTYPE');
            const dtPosted = getTag('DTPOSTED'); // YYYYMMDD
            const trnAmt = getTag('TRNAMT');
            const fitId = getTag('FITID');
            // Try MEMO then NAME for Brazillian Banks (Some use NAME as primary)
            const memo = getTag('MEMO') || getTag('NAME') || 'Sem descrição';

            if (dtPosted && trnAmt) {
                const year = dtPosted.substring(0, 4);
                const month = dtPosted.substring(4, 6);
                const day = dtPosted.substring(6, 8);
                const amount = parseFloat(trnAmt.replace(',', '.')); // Normalize potential comma in amount
                
                transactions.push({
                    date: `${year}-${month}-${day}`,
                    amount: Math.abs(amount),
                    description: memo,
                    type: amount >= 0 ? 'income' : 'expense',
                    rawId: fitId ? `ofx-${accountId}-${fitId}` : `ofx-gen-${accountId}-${Math.abs(amount).toFixed(2)}-${year}-${month}-${day}`
                });
            }
        });

        return BankFileParserService.enrichTransactions(transactions);
    },

    /**
     * Highly Robust and Adaptive CSV Parser
     */
    parseCSV: (content, account) => {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];
        
        const accountId = account?.id || 'default';
        const accountType = account?.type || 'checking';

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
        
        const isCreditCard = accountType === 'credit';

        // Specific column mapping for Mercado Pago, NuBank and others
        // Detect specific Bank Formats
        const isInter = headers.some(h => h.includes('nome da parte') || h.includes('conta de destino'));
        const isBradesco = headers.some(h => h.includes('documento') || h.includes('do mcto'));
        const isBB = headers.some(h => h.includes('data do mcto') || h.includes('dependência de origem'));
        const isNuBankCC = headers.includes('title') && headers.includes('category') && headers.includes('amount');

        let mapping = { dateIdx: -1, amountIdx: -1, descIdx: -1, idIdx: -1 };

        if (isInter) {
            mapping = {
                dateIdx: headers.findIndex(h => h.includes('data de lançamento')),
                amountIdx: headers.findIndex(h => h.includes('valor')),
                descIdx: headers.findIndex(h => h.includes('tipo de transação') || h.includes('descrição')),
                idIdx: -1 
            };
        } else if (isBradesco) {
            mapping = {
                dateIdx: headers.findIndex(h => h.includes('data')),
                amountIdx: headers.findIndex(h => h.includes('valor')),
                descIdx: headers.findIndex(h => h.includes('histórico')),
                idIdx: headers.findIndex(h => h.includes('docto'))
            };
        } else if (isBB) {
            mapping = {
                dateIdx: headers.findIndex(h => h.includes('data')),
                amountIdx: headers.findIndex(h => h.includes('valor')),
                descIdx: headers.findIndex(h => h.includes('histórico')),
                idIdx: headers.findIndex(h => h.includes('documento'))
            };
        } else if (headers.includes('descrição') || headers.includes('líquido')) {
            // Mercado Pago / Generic with common headers
            mapping = {
                dateIdx: headers.findIndex(h => h.includes('data') || h.includes('fecha')),
                amountIdx: headers.findIndex(h => h.includes('líquido') || h.includes('net') || h.includes('monto') || h.includes('valor')),
                descIdx: headers.findIndex(h => h.includes('descrição') || h.includes('descrip') || h.includes('detalhe') || h.includes('título')),
                idIdx: headers.findIndex(h => h.includes('id') || h.includes('identifica'))
            };
        }

        const transactions = [];

        lines.forEach((line, idx) => {
            if (idx === 0) return; // Skip Header
            
            // Handle quotes in CSV values for commas within descriptions
            const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
            
            let dateStr, amountStr, description, rawId;

            if (mapping.dateIdx !== -1 && mapping.amountIdx !== -1) {
                dateStr = parts[mapping.dateIdx];
                amountStr = parts[mapping.amountIdx];
                description = parts[mapping.descIdx] || 'Lançamento Bancário';
                rawId = mapping.idIdx !== -1 ? `${parts[mapping.idIdx]}` : null;
            } else if (isNuBankCC) {
                // date,category,title,amount
                dateStr = parts[0];
                description = parts[2];
                amountStr = parts[3];
            } else {
                // Heuristic Fallback
                dateStr = parts.find(p => p.match(/\d{2}\/\d{2}\/\d{2,4}/) || p.match(/\d{4}-\d{2}-\d{2}/));
                const amountMatches = parts.filter(p => {
                    const clean = p.replace(/[R$ \s]/g, '');
                    return clean.match(/^-?\d+([.,]\d+)?$/) || clean.match(/^-?\d{1,3}(\.\d{3})*(,\d{2})?$/);
                });
                amountStr = amountMatches.length > 0 ? amountMatches[amountMatches.length - 1] : null;
                description = parts.find(p => p.length >= 2 && p !== dateStr && p !== amountStr) || 'Lançamento Bancário';
            }

            if (dateStr && amountStr) {
                try {
                    // Normalize Date
                    let normalizedDate = '';
                    if (dateStr.includes('/')) {
                        const bits = dateStr.split('/');
                        if (bits[0].length === 4) normalizedDate = `${bits[0]}-${bits[1]}-${bits[2]}`;
                        else {
                            const year = bits[2]?.length === 2 ? `20${bits[2]}` : (bits[2] || '2024');
                            normalizedDate = `${year}-${bits[1]}-${bits[0]}`;
                        }
                    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        normalizedDate = dateStr;
                    } else if (dateStr.length >= 10) {
                        normalizedDate = dateStr.substring(0, 10);
                    }

                    // Normalize Amount
                    let cleanAmt = amountStr.replace(/[R$ \s]/g, '');
                    if (cleanAmt.includes(',') && cleanAmt.includes('.')) {
                        cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.');
                    } else if (cleanAmt.includes(',')) {
                        cleanAmt = cleanAmt.replace(',', '.');
                    }
                    let amount = parseFloat(cleanAmt);

                    if (!isNaN(amount) && normalizedDate) {
                        const fingerprint = rawId || `csv-v4-${accountId}-${Math.abs(amount).toFixed(2)}-${normalizedDate}-${description.slice(0,10)}`;

                        let type = amount >= 0 ? 'income' : 'expense';
                        
                        // Lógica de Polaridade Invertida para Cartão de Crédito
                        // No NuBank CC: Positivo = Compra (Despesa), Negativo = Pagamento de fatura (Entrada)
                        if (isCreditCard || isNuBankCC) {
                            if (description.toLowerCase().includes('pagamento') || amount < 0) {
                                type = 'income'; // Pagou a fatura = saldo do cartão melhora
                            } else {
                                type = 'expense'; // Comprou algo = saldo do cartão piora
                            }
                        }

                        transactions.push({
                            date: normalizedDate,
                            amount: Math.abs(amount),
                            description: description,
                            type: type,
                            rawId: fingerprint
                        });
                    }
                } catch (e) {
                    console.error('Error on CSV line:', line, e);
                }
            }
        });

        return BankFileParserService.enrichTransactions(transactions);
    },

    /**
     * Categorize, detect installments, and identify operation IDs
     */
    enrichTransactions: (transactions) => {
        return transactions.map(t => {
            let category = t.type === 'income' ? 'Vendas de Produtos' : 'Outros';
            let isAISuggested = false;
            let installmentNumber = 1;
            let installmentsTotal = 1;

            const desc = t.description || '';
            
            // --- DETECÇÃO UNIVERSAL DE PARCELAS ---
            // Suporta: (Parcela 02 de 10), - Parcela 3/10, (02/10), (Parc 1/5), (P: 01/12), 2/12, etc.
            const instRegex = /(?:[(-]\s*)?(?:Parcela|Parc\.?|P:?)?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\)?/i;
            const instMatch = desc.match(instRegex);
            
            if (instMatch) {
                installmentNumber = parseInt(instMatch[1]);
                installmentsTotal = parseInt(instMatch[2]);
                isAISuggested = true;
            }

            // --- EXTRAÇÃO DE ID DE OPERAÇÃO ---
            const opIdMatch = desc.match(/(?:(?:MP|ML)\*|MERCADO\s?PAGO\s?|MERCADOLIVRE\s?|TID:?\s*)(\d{9,15})/i);
            const bankReferenceId = t.rawId || (opIdMatch ? opIdMatch[1] : null);

            // Re-checar regras de categorização automática
            for (const rule of AUTO_CAT_RULES) {
                if (rule.pattern.test(desc)) {
                    category = rule.category;
                    isAISuggested = true;
                    break;
                }
            }

            return {
                ...t,
                id: Math.random().toString(36).substring(7),
                category,
                isAISuggested,
                installmentNumber,
                installmentsTotal,
                bankReferenceId,
                status: 'paid'
            };
        });
    },

    /**
     * Cross-reference with DB to flag duplicates
     */
    /**
     * Cross-reference with DB to flag duplicates
     */
    flagDuplicates: (newTransactions, existingTransactions) => {
        return newTransactions.map(nt => {
            const match = existingTransactions.find(et => 
                (et.bankReferenceId === nt.rawId && nt.rawId) || 
                (et.date === nt.date && 
                 Math.abs(Number(et.amount)) === Math.abs(Number(nt.amount)) &&
                 et.description.toLowerCase().trim() === nt.description.toLowerCase().trim())
            );
            return { 
                ...nt, 
                isDuplicate: !!match, 
                existingId: match ? match.id : null 
            };
        });
    },

    /**
     * Intelligent matching: find pending system transactions OR orders that match a bank record
     */
    findMatchingPending: (bankRecord, pendingTransactions, pendingOrders = []) => {
        // 1. Try matching with existing pending transactions
        const transMatch = pendingTransactions.find(pt => {
            if (pt.status !== 'pending') return false;
            if (Math.abs(Number(pt.amount)) !== Math.abs(Number(bankRecord.amount))) return false;
            
            const bDate = new Date(bankRecord.date);
            const pDate = new Date(pt.date);
            const diffDays = Math.ceil(Math.abs(bDate - pDate) / (1000 * 60 * 60 * 24));
            
            return diffDays <= 4;
        });

        if (transMatch) return { type: 'transaction', item: transMatch };

        // 2. Try matching with pending orders (only for income)
        if (bankRecord.type === 'income') {
            const orderMatch = pendingOrders.find(po => {
                const isPaid = po.paymentStatus === 'paid';
                if (isPaid) return false;
                
                if (Math.abs(Number(po.total || 0)) !== Math.abs(Number(bankRecord.amount))) return false;
                
                const bDate = new Date(bankRecord.date);
                const oDate = new Date(po.date || po.createdAt);
                const diffDays = Math.ceil(Math.abs(bDate - oDate) / (1000 * 60 * 60 * 24));
                
                // Orders might have a wider window (payment after order)
                return diffDays <= 7;
            });

            if (orderMatch) return { type: 'order', item: orderMatch };
        }

    },

    /**
     * Universal Raw Text Parser (The "Copy-Paste" Importer)
     * Detects dates, descriptions and amounts in unstructured text.
     */
    parseRawText: (text, account) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
        const transactions = [];
        const isCreditCard = account?.type === 'credit';
        const accountId = account?.id || 'default';

        const monthMap = {
            'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };

        // RegEx patterns
        const stdDateRegex = /(\d{2}\/\d{2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2})/;
        const brDateRegex = /(\d{1,2})\s+de\s+([a-z]{3})\.?\s+(\d{4})/; // "15 de jun. 2025"
        const amountRegex = /([+-]?\s*R?\$?\s*(\d{1,3}(\.\d{3})*|(\d+))([.,]\d{2}))/;

        lines.forEach(line => {
             const lowerLine = line.toLowerCase();
             const stdMatch = line.match(stdDateRegex);
             const brMatch = lowerLine.match(brDateRegex);
             const amountMatch = line.match(amountRegex);

             if ((stdMatch || brMatch) && amountMatch) {
                 const amountStr = amountMatch[0];
                 let normalizedDate = '';

                 if (brMatch) {
                     const [_, day, monthAbbr, year] = brMatch;
                     const month = monthMap[monthAbbr] || '01';
                     normalizedDate = `${year}-${month}-${day.padStart(2, '0')}`;
                 } else if (stdMatch) {
                     const dateStr = stdMatch[0];
                     if (dateStr.includes('/')) {
                         const bits = dateStr.split('/');
                         const yr = bits[2] ? (bits[2].length === 2 ? `20${bits[2]}` : bits[2]) : new Date().getFullYear().toString();
                         normalizedDate = `${yr}-${bits[1].padStart(2, '0')}-${bits[0].padStart(2, '0')}`;
                     } else {
                         normalizedDate = dateStr;
                     }
                 }

                 // Extract description: remove date and amount strings
                 let rawDescription = line;
                 if (brMatch) rawDescription = rawDescription.replace(line.substring(brMatch.index, brMatch.index + brMatch[0].length), '');
                 if (stdMatch) rawDescription = rawDescription.replace(stdMatch[0], '');
                 rawDescription = rawDescription.replace(amountStr, '').replace(/R\$/g, '').replace(/ - /g, ' ').replace(/[ ]+/g, ' ').trim();

                 // --- LOGICA DE DETECÇÃO DE PARCELA ---
                 // Suporta: (Parcela 02 de 10), - Parcela 3/10, (02/10), (Parc 1/5), (P: 01/12), etc.
                 const installmentRegex = /([(-]\s*)?(Parcela|Parc\.?|P:?)?\s*(\d{1,2})\s*(de|\/)\s*(\d{1,2})\)?|(\s+(\d{1,2})\/(\d{1,2})\s*)$/i;
                 const instMatch = rawDescription.match(installmentRegex);
                 
                 let installment = null;
                 let cleanedDescription = rawDescription;
                 
                 if (instMatch) {
                     // instMatch[2] ou instMatch[6] para a parcela atual
                     // instMatch[4] ou instMatch[7] para o total
                     const current = instMatch[2] || instMatch[6];
                     const total = instMatch[4] || instMatch[7];
                     if (current && total) {
                        installment = `${current.padStart(2, '0')}/${total.padStart(2, '0')}`;
                        cleanedDescription = rawDescription.replace(instMatch[0], '').replace(/\s+/g, ' ').trim();
                     }
                 }
                 
                 if (cleanedDescription.length < 2) cleanedDescription = "Lançamento via Texto";

                 // Normalize Amount
                 let cleanAmt = amountStr.replace(/[R$ \s]/g, '');
                 const isPlus = amountStr.includes('+');
                 
                 if (cleanAmt.includes(',') && cleanAmt.includes('.')) {
                    cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.');
                 } else if (cleanAmt.includes(',')) {
                    cleanAmt = cleanAmt.replace(',', '.');
                 }
                 
                 let amountValue = parseFloat(cleanAmt);

                 if (!isNaN(amountValue)) {
                    // Logic based on polarity (+ R$ vs - R$ or plain)
                    let type = (amountValue > 0 && !isPlus) ? 'expense' : 'income';
                    
                    // IF it has a "+" explicitly, it's income
                    if (isPlus) type = 'income';

                    // Credit card specific logic
                    if (isCreditCard) {
                        const lowDesc = cleanedDescription.toLowerCase();
                        if (isPlus || lowDesc.includes('pagamento') || lowDesc.includes('estorno') || lowDesc.includes('crédito')) {
                            type = 'income'; 
                        } else {
                            type = 'expense';
                        }
                    }

                    transactions.push({
                        date: normalizedDate,
                        amount: Math.abs(amountValue),
                        description: cleanedDescription,
                        installment, // AGORA SENDO PASSADO!
                        type,
                        // Incluindo o accountId no rawId para permitir importar o mesmo valor em contas diferentes
                        rawId: `txt-${accountId}-${Math.abs(amountValue).toFixed(2)}-${normalizedDate}-${cleanedDescription.slice(0,10)}`
                    });
                 }
             }
        });

        return BankFileParserService.enrichTransactions(transactions);
    }
};
