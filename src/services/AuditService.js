
import db from './database.js';

const AuditService = {
  log: async (user, action, entity, entityId, details) => {
    try {
      const logEntry = {
        user: user?.email || user?.name || 'Sistema',
        action: action, // 'CREATE', 'UPDATE', 'DELETE'
        entity: entity, // 'Order', 'Customer', 'Product', etc.
        entityId: entityId,
        details: details, // String or Object describing change
        timestamp: new Date().toISOString()
      };
      
      // Save directly to 'system_logs' collection
      await db.create('system_logs', logEntry);
      
      console.log(`[AUDIT] ${action} ${entity} #${entityId}`);
    } catch (error) {
      console.error("Failed to create audit log", error);
    }
  },

  getLogs: async () => {
      try {
          const logs = await db.getAll('system_logs') || [];
          // Sort descending by timestamp
          return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } catch (error) {
          console.error("Failed to fetch logs", error);
          return [];
      }
  }
};

export default AuditService;
