import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const privateKeyHex = "737569707269766b65793171706c7032713070347a3972786e3861667436347970306b777963336c6c66367539667a793061637a6d336476726166757261686a30307a78676d";

try {
    const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    const address = keypair.getPublicKey().toSuiAddress();
    
    console.log('Wallet Address:', address);
} catch (error) {
    console.error('Error:', error.message);
}