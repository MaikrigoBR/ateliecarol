import admin from 'firebase-admin';

// The private key containing new-line characters needs to be formatted properly
// if read from environment variables, but since we are bundling this directly 
// into the Node environment, we can pass it natively.
const serviceAccount = {
  "type": "service_account",
  "project_id": "webatelie-1cf7e",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID || "",
  "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : "",
  "client_email": "firebase-adminsdk-fbsvc@webatelie-1cf7e.iam.gserviceaccount.com",
  "client_id": "110070319917562019672",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40webatelie-1cf7e.iam.gserviceaccount.com"
};

let db;

try {
    if (!admin.apps.length) {
        // Apenas inicializa se houver pelo menos as chaves ou mocka
        if (process.env.FIREBASE_PRIVATE_KEY) {
             admin.initializeApp({
                 credential: admin.credential.cert(serviceAccount)
             });
        }
    }
    if (admin.apps.length > 0) {
        db = admin.firestore();
    }
} catch (e) {
    console.error("Firebase Admin Initialization Error:", e);
}

export { db, admin };
