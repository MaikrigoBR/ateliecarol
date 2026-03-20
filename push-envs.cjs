const { spawnSync } = require('child_process');

const envs = {
  VITE_FIREBASE_API_KEY: "AIzaSyAMVeDqvR2iT1bEa7DqAoPa4VVmmK-ARSs",
  VITE_FIREBASE_AUTH_DOMAIN: "webatelie-1cf7e.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "webatelie-1cf7e",
  VITE_FIREBASE_STORAGE_BUCKET: "webatelie-1cf7e.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "909595873000",
  VITE_FIREBASE_APP_ID: "1:909595873000:web:b61a50179ba235e9fcc35d",
  VITE_FIREBASE_MEASUREMENT_ID: "G-PH00VL84NW",
  VITE_WHATSAPP_API_URL: "https://whatsapp-bridge-api-production.up.railway.app"
};

for (const [key, val] of Object.entries(envs)) {
   console.log("Removing", key);
   spawnSync('npx.cmd', ['vercel', 'env', 'rm', key, 'production', '-y']);
   console.log("Adding", key);
   spawnSync('npx.cmd', ['vercel', 'env', 'add', key, 'production'], {
       input: val,
       stdio: ['pipe', 'inherit', 'inherit']
   });
}
console.log("Done!");
