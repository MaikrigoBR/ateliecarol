import fetch from 'node-fetch';

async function test() {
    const res = await fetch("https://ateliecarol.vercel.app/api/check_payment?orderId=LWD07X");
    const data = await res.json();
    console.log(data);
}
test();
