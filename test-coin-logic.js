
// This script simulates the coin calculation logic to ensure it's correct
function testCoinLogic(pkgName, pkgCoins, durationDays) {
    console.log(`Testing: ${pkgName} (${pkgCoins} coins/mo) for ${durationDays} days`);

    let multiplier = 1;
    if (durationDays >= 300) {
        multiplier = 12;
    } else if (durationDays >= 90) {
        multiplier = 3;
    }

    const total = pkgCoins * multiplier;
    console.log(`-> Multiplier: ${multiplier}`);
    console.log(`-> Total Coins: ${total}`);
    return total;
}

testCoinLogic('HocVien', 100, 365); // Expect 1200
testCoinLogic('Pro', 200, 30);      // Expect 200
testCoinLogic('Starter', 50, 90);   // Expect 150
