import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function submitForVetting(walletCredentials = null) {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    // Validate environment variables
    if (PACKAGE_ID === 'YOUR_PACKAGE_ID' || VETTING_TABLE_ID === 'YOUR_VETTING_TABLE_ID') {
        throw new Error('PACKAGE_ID or VETTING_TABLE_ID not set in .env file');
    }

    let keypair;

    // Use provided credentials or fall back to environment variables
    if (walletCredentials) {
        if (walletCredentials.mnemonic) {
            keypair = Ed25519Keypair.deriveKeypair(walletCredentials.mnemonic);
        } else if (walletCredentials.privateKey) {
            try {
                let keyBytes;
                const privateKey = walletCredentials.privateKey;
                if (privateKey.length === 64) {
                    keyBytes = fromHex('0x' + privateKey);
                } else if (privateKey.length === 66 && privateKey.startsWith('0x')) {
                    keyBytes = fromHex(privateKey);
                } else {
                    throw new Error(`Invalid private key format. Expected 64 hex characters, got ${privateKey.length}`);
                }
                
                // Ensure we have exactly 32 bytes for the private key
                if (keyBytes.length === 64) {
                    // This means it's the full 64-byte secret key (private + public)
                    keyBytes = keyBytes.slice(0, 32); // Take only the 32-byte private key part
                } else if (keyBytes.length !== 32) {
                    throw new Error('Invalid private key byte length after hex decoding. Expected 32 bytes.');
                }
                
                keypair = Ed25519Keypair.fromSecretKey(keyBytes);
            } catch (error) {
                throw new Error('Failed to load private key. Make sure it\'s a valid 64-character hex string.');
            }
        } else {
            throw new Error('Either mnemonic or privateKey must be provided in walletCredentials');
        }
    } else {
        // Try loading from environment variables
        const mnemonic = process.env.MNEMONIC;
        const privateKey = process.env.PRIVATE_KEY;

        if (mnemonic) {
            keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        } else if (privateKey) {
            try {
                let keyBytes;
                if (privateKey.length === 64) {
                    keyBytes = fromHex('0x' + privateKey);
                } else if (privateKey.length === 66 && privateKey.startsWith('0x')) {
                    keyBytes = fromHex(privateKey);
                } else {
                    throw new Error(`Invalid private key format. Expected 64 hex characters, got ${privateKey.length}`);
                }
                
                // Ensure we have exactly 32 bytes for the private key
                if (keyBytes.length === 64) {
                    // This means it's the full 64-byte secret key (private + public)
                    keyBytes = keyBytes.slice(0, 32); // Take only the 32-byte private key part
                } else if (keyBytes.length !== 32) {
                    throw new Error('Invalid private key byte length after hex decoding. Expected 32 bytes.');
                }
                
                keypair = Ed25519Keypair.fromSecretKey(keyBytes);
            } catch (error) {
                throw new Error('Failed to load private key from environment. Make sure it\'s a valid 64-character hex string.');
            }
        } else {
            throw new Error('Either MNEMONIC or PRIVATE_KEY must be set in the .env file, or provide walletCredentials');
        }
    }

    const address = keypair.getPublicKey().toSuiAddress();

    // Check balance
    try {
        const balance = await client.getBalance({ owner: address });
        const suiAmount = parseInt(balance.totalBalance) / 1000000000;
        
        if (parseInt(balance.totalBalance) === 0) {
            throw new Error(`No SUI tokens found in wallet ${address}. Please fund your wallet first.`);
        }
    } catch (error) {
        if (error.message.includes('No SUI tokens found')) {
            throw error;
        }
        console.warn('Could not check balance:', error.message);
    }

    // Create transaction
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::vetting::submit_for_vetting`,
        arguments: [tx.object(VETTING_TABLE_ID)],
    });

    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { 
                showEffects: true,
                showEvents: true 
            },
        });
        
        if (result.effects?.status?.status === 'success') {
            return {
                success: true,
                transactionDigest: result.digest,
                applicantAddress: address,
                message: 'Vetting submission successful'
            };
        } else {
            throw new Error(`Transaction failed: ${result.effects?.status}`);
        }
        
    } catch (error) {
        console.error('Error executing transaction:', error.message);
        throw error;
    }
}