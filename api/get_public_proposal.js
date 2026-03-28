import { db } from './firebaseAdmin.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!db) {
        return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    try {
        const budgetId = String(req.query.id || '').trim();
        const token = String(req.query.t || '').trim();

        if (!budgetId) {
            return res.status(400).json({ error: 'Budget id is required' });
        }

        const budgetSnap = await db.collection('budgets').doc(budgetId).get();
        if (!budgetSnap.exists) {
            return res.status(404).json({ error: 'Proposal not found' });
        }

        const budget = { id: budgetSnap.id, ...budgetSnap.data() };
        if (budget.deleted === true) {
            return res.status(404).json({ error: 'Proposal not found' });
        }

        const hasStoredToken = typeof budget.publicToken === 'string' && budget.publicToken.trim() !== '';
        const canAccess = hasStoredToken
            ? token === budget.publicToken
            : budget.publicAccess === true || budget.status === 'Enviado' || budget.status === 'Aprovado' || budget.status === 'Rejeitado';

        if (!canAccess) {
            return res.status(403).json({ error: 'Proposal is not publicly accessible' });
        }

        const settingsSnap = await db.collection('settings').doc('global').get();
        const companyConfig = settingsSnap.exists ? settingsSnap.data() : null;

        const productIds = Array.from(new Set(
            (budget.items || [])
                .map((item) => String(item.productId || ''))
                .filter((productId) => productId && !productId.startsWith('equip-') && !productId.startsWith('mat-'))
        ));

        const productDocs = await Promise.all(
            productIds.map(async (productId) => {
                const productSnap = await db.collection('products').doc(productId).get();
                return productSnap.exists ? { id: productSnap.id, ...productSnap.data() } : null;
            })
        );

        const { publicToken, ...safeBudget } = budget;

        return res.status(200).json({
            success: true,
            budget: safeBudget,
            companyConfig,
            products: productDocs.filter(Boolean)
        });
    } catch (error) {
        console.error('Public proposal API error:', error);
        return res.status(500).json({ error: error.message });
    }
}
