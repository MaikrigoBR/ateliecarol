import fetch from 'node-fetch';

async function checkFirebase() {
    const firebaseUrl = 'https://firestore.googleapis.com/v1/projects/webatelie-1cf7e/databases/(default)/documents/settings/crm_collection';
    const res = await fetch(firebaseUrl);
    console.log(res.status);
    console.log(await res.text());
}

checkFirebase();
