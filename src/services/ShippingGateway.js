// Gateway de Cálculo de Fretes Automatizado
// Para uso definitivo em Produção, recomendamos inserir o Token do Melhor Envio no Painel de Configurações,
// o qual será lido por este Gateway via `db.getById('settings', 'global')`.

import db from './database';

class ShippingGateway {
    
    constructor() {
        this.provider = 'melhorenvio_ou_correios_mock';
    }

    /**
     * Calcula o frete baseado no CEP de destino.
     * Na ausência de Tokens de API das transportadoras, utiliza uma Tabela de Frete Nacional Automatizada,
     * baseada em simulações demográficas (Matriz de Distância/Estado).
     * @param {string} destCep - CEP de destino limpo (apenas números)
     * @param {Array} cartItems - Itens do carrinho (para cálculo futuro de peso cúbico)
     */
    async calculateShipping(destCep, cartItems = []) {
        if (!destCep || destCep.length !== 8) return [];

        // 1. Pega as configurações globais da loja (Para CEP de Origem e Tokens)
        const settings = await db.getById('settings', 'global');
        const originCep = settings?.companyCep?.replace(/\D/g, '') || "46960000"; // Fallback para Lençóis/BA se não houver configurações
        const nationwideEnabled = settings?.nationwideShippingEnabled === true;
        const localFee = settings?.localDeliveryFee !== undefined ? Number(settings.localDeliveryFee) : 5.00;
        const packagingFee = settings?.packagingFee !== undefined ? Number(settings.packagingFee) : 0.00;

        console.log(`Buscando fretes para Rota: ${originCep} -> ${destCep}`);

        // Aqui você faria o fetch() real para a API do Melhor Envio.
        // Simulando a Matriz de Cálculo Dinâmica do Brasil:
        
        // 2. Descobre a região alvo pelo prefixo do CEP do destino
        const prefix = parseInt(destCep.substring(0, 2));
        
        let basePac = 20.00;
        let baseSedex = 35.00;
        let pacDays = 7;
        let sedexDays = 2;

        // Tabela Lógica Aproximada (Se a loja for de SP. Ajustável futuramente via Origem/Destino real API)
        if (prefix >= 1 && prefix <= 19) {
            // SP Capital e Interior (Local)
            basePac = 14.90; baseSedex = 21.50;
            pacDays = 4; sedexDays = 1;
        } else if ((prefix >= 20 && prefix <= 29) || (prefix >= 30 && prefix <= 39) || (prefix >= 80 && prefix <= 89)) {
            // RJ, ES, MG, PR (Sudeste/Sul Próximo)
            basePac = 23.50; baseSedex = 42.00;
            pacDays = 6; sedexDays = 3;
        } else if ((prefix >= 40 && prefix <= 49) || (prefix >= 50 && prefix <= 59)) {
            // BA, PE, NE (Nordeste)
            basePac = 38.00; baseSedex = 75.00;
            pacDays = 12; sedexDays = 5;
        } else if (prefix >= 60 && prefix <= 69) {
            // CE, AM, PA, AC, RR, AP (Norte / NE Superior)
            basePac = 45.00; baseSedex = 98.00;
            pacDays = 18; sedexDays = 7;
        } else if (prefix >= 70 && prefix <= 79) {
            // DF, GO, MT, MS (Centro-Oeste)
            basePac = 29.90; baseSedex = 58.00;
            pacDays = 8; sedexDays = 4;
        }

        // Simula um peso volumétrico baseado nos itens do carrinho
        // (Ex: + R$ 1,50 a cada item extra na sacola)
        const volumeFactor = Math.max(0, cartItems.length - 1) * 1.5;
        
        basePac += volumeFactor + packagingFee;
        baseSedex += volumeFactor + packagingFee;

        // Monta o Retorno final baseado nas Permissões da Loja
        let options = [];

        // 1. Regra de Ouro para CEPs Genéricos ou Mesma Cidade (Sempre ativo se for da mesma cidade)
        const isLocal = (destCep === originCep || destCep.substring(0, 5) === originCep.substring(0, 5));
        
        if (isLocal) {
            options.push({
                id: 'motoboy',
                name: 'Entregador Local (Motoboy / Mensageiro)',
                price: localFee + packagingFee,
                delivery_time: 1,
                logo: ''
            });
        }

        // 2. Fretes Nacionais (Só injeta se a loja permitir atuação nacional no Painel)
        if (nationwideEnabled) {
            options.push(
                {
                    id: 'pac',
                    name: 'Correios PAC (Econômico)',
                    price: Number(basePac.toFixed(2)),
                    delivery_time: pacDays,
                    logo: 'https://viacep.com.br/correios-logo.png'
                },
                {
                    id: 'sedex',
                    name: 'Correios Sedex (Expresso)',
                    price: Number(baseSedex.toFixed(2)),
                    delivery_time: sedexDays,
                    logo: 'https://viacep.com.br/correios-logo.png'
                },
                {
                    id: 'jadlog',
                    name: 'Jadlog Package (.Com)',
                    price: Number((basePac * 0.9).toFixed(2)),
                    delivery_time: pacDays + 2,
                    logo: ''
                }
            );
        }

        return options;
    }
}

export default new ShippingGateway();
