import fetch from 'node-fetch';

async function checkPending() {
    console.log("Fetching orders from Firebase via REST API...");
    // Since Firebase JS SDK is annoying to set up without proper package.json,
    // I will call my own Vercel API!
    
    // I don't know the exact order ID, so let me just fetch check_payment with random text and see if it fails.
    try {
        const url = `https://ateliecarol.vercel.app/api/check_payment?orderId=12345`;
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const data = await res.json();
        console.log(`Response:`, data);
    } catch(e) {
        console.error("Error:", e);
    }
}
checkPending();
