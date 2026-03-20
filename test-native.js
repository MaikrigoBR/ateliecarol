
async function checkPending() {
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
