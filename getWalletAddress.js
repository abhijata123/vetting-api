import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const privateKeyHex = "737569707269766b65793171706c7032713070347a3972786e3861667436347970306b777963336c6c66367539667a793061637a6d336476726166757261686a30307a78676d";

function tryExtractKey(hex, description) {
    try {
        const bytes = new Uint8Array(Buffer.from(hex, 'hex'));
        const keypair = Ed25519Keypair.fromSecretKey(bytes);
        const address = keypair.getPublicKey().toSuiAddress();
        console.log(`✅ ${description}: ${address}`);
        return address;
    } catch (error) {
        console.log(`❌ ${description}: ${error.message}`);
        return null;
    }
}

// Convert full hex to bytes to analyze
const fullBytes = Buffer.from(privateKeyHex, 'hex');
console.log('Full length:', fullBytes.length, 'bytes');

// Try different extractions
if (fullBytes.length === 70) {
    const first32 = privateKeyHex.slice(0, 64);  // First 32 bytes
    const last32 = privateKeyHex.slice(-64);     // Last 32 bytes
    const middle32 = privateKeyHex.slice(12, 76); // Bytes 6-38 (12 hex chars = 6 bytes)
    
    tryExtractKey(first32, "First 32 bytes");
    tryExtractKey(last32, "Last 32 bytes");
    tryExtractKey(middle32, "Middle 32 bytes");
}