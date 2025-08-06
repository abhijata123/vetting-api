// Simple script to convert Sui private key to wallet address (ES Module version)
// Note: This is for educational/recovery purposes only

import crypto from 'crypto';

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function getSuiAddressFromPrivateKey(privateKeyHex) {
    try {
        // Remove '0x' prefix if present
        const cleanPrivateKey = privateKeyHex.replace('0x', '');
        
        // Convert hex to bytes
        const privateKeyBytes = hexToBytes(cleanPrivateKey);
        
        console.log('Private Key (hex):', cleanPrivateKey);
        console.log('Private Key length:', privateKeyBytes.length, 'bytes');
        
        // Note: This is a simplified example
        // For actual Sui address derivation, you should use the official Sui SDK
        console.log('\n⚠️  WARNING: Use official Sui SDK for production!');
        console.log('Install with: npm install @mysten/sui.js');
        
        return {
            privateKey: cleanPrivateKey,
            privateKeyBytes: privateKeyBytes,
            note: "Use @mysten/sui.js for actual address derivation"
        };
        
    } catch (error) {
        console.error('Error processing private key:', error.message);
        return null;
    }
}

// Example usage (replace with your actual private key)
const privateKey = "737569707269766b65793171706c7032713070347a3972786e3861667436347970306b777963336c6c66367539667a793061637a6d336476726166757261686a30307a78676d";
const result = getSuiAddressFromPrivateKey(privateKey);

if (result) {
    console.log('\nResult:', result);
}

// Better approach using Sui SDK (ES Module syntax):
console.log('\n--- Proper way with Sui SDK (ES Module) ---');
console.log(`
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

// First install: npm install @mysten/sui.js
const privateKeyHex = "your_private_key_here";
const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
const address = keypair.getPublicKey().toSuiAddress();

console.log('Wallet Address:', address);
`);