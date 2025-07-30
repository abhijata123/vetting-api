import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function submitForVetting() {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    let keypair;

    // Try loading from different wallet sources
    const mnemonic = process.env.MNEMONIC;
    const privateKey = process.env.PRIVATE_KEY;

    if (mnemonic) {
        console.log('Using mnemonic from environment...');
        keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    } else if (privateKey) {
        console.log('Using private key from environment...');
        
        try {
            // Handle hex private key (64 characters)
            let keyBytes;
            if (privateKey.length === 64) {
                keyBytes = fromHex('0x' + privateKey);
            } else if (privateKey.length === 66 && privateKey.startsWith('0x')) {
                keyBytes = fromHex(privateKey);
            } else {
                throw new Error(`Invalid private key format. Expected 64 hex characters, got ${privateKey.length}`);
            }
            
            keypair = Ed25519Keypair.fromSecretKey(keyBytes);
        } catch (error) {
            console.error('Error loading private key:', error.message);
            throw new Error('Failed to load private key. Make sure it\'s a valid 64-character hex string.');
        }
    } else {
        throw new Error('Either MNEMONIC or PRIVATE_KEY must be set in the .env file');
    }

    const address = keypair.getPublicKey().toSuiAddress();
    console.log('Using wallet address:', address);

    // Check balance
    try {
        const balance = await client.getBalance({ owner: address });
        const suiAmount = parseInt(balance.totalBalance) / 1000000000;
        console.log(`Wallet balance: ${suiAmount} SUI`);
        
        if (parseInt(balance.totalBalance) === 0) {
            console.error('❌ No SUI tokens found. Please fund your wallet first.');
            console.log(`Visit: https://faucet.testnet.sui.io/`);
            console.log(`Address: ${address}`);
            return;
        }
    } catch (error) {
        console.warn('Could not check balance:', error.message);
    }

    // Create transaction
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::vetting::submit_for_vetting`,
        arguments: [tx.object(VETTING_TABLE_ID)],
    });

    try {
        console.log('Submitting for vetting...');
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { 
                showEffects: true,
                showEvents: true 
            },
        });
        
        console.log('✅ Transaction executed successfully!');
        console.log('Transaction digest:', result.digest);
        
        if (result.effects?.status?.status === 'success') {
            console.log('✅ Vetting submission successful!');
        } else {
            console.log('❌ Transaction failed:', result.effects?.status);
        }
        
        console.log('\nFull result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Error executing transaction:', error.message);
        throw error;
    }
}

submitForVetting();