export const unitConversions = {
    'm': {
        'm': 1,
        'cm': 0.01,
        'mm': 0.001
    },
    'm²': { // Metro Quadrado
        'm²': 1,
        'cm²': 0.0001,
        'mm²': 0.000001
    },
    'kg': {
        'kg': 1,
        'g': 0.001,
        'mg': 0.000001
    },
    'l': {
        'l': 1,
        'ml': 0.001
    },
    'cx': {
        'cx': 1,
        'un': 1 // Aqui o usuário informa a fração (ex: 0.1 caixa = 1 unidade, caso caixa tenha 10)
    },
    'pct': {
        'pct': 1,
        'un': 1 
    },
    'un': {
        'un': 1
    }
};

export const getSubUnits = (baseUnit) => {
    if (!baseUnit || !unitConversions[baseUnit]) return [baseUnit || 'un'];
    return Object.keys(unitConversions[baseUnit]);
};

export const calculateFractionalCost = (baseCost, baseUnit, usageUnit, usageQty) => {
    const qty = parseFloat(usageQty) || 0;
    const cost = parseFloat(baseCost) || 0;
    
    if (baseUnit === usageUnit || !unitConversions[baseUnit] || !unitConversions[baseUnit][usageUnit]) {
        return cost * qty;
    }

    const conversionFactor = unitConversions[baseUnit][usageUnit];
    // Se a base é M (custo $10/m). Eu uso 1 CM (fator 0.01).
    // O custo é $10 * (1 * 0.01) = 10 * 0.01 = 0.1
    return cost * (qty * conversionFactor);
};
