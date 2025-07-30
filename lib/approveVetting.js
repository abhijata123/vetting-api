import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function approveVetting(applicantAddress) {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const ADMIN_CAP_ID = process.env.ADMIN_CAP || 'YOUR_ADMIN_CAP_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    // Validate required environment variables
    if (PACKAGE_ID === 'YOUR_PACKAGE_ID' || VETTING_TABLE_ID === 'YOUR_VETTING_TABLE_ID' || ADMIN_CAP_ID === 'YOUR_ADMIN_CAP_ID') {
        throw new Error('Required environment variables not set: PACKAGE_ID, VETTING_TABLE_ID, or ADMIN_CAP');
    }

    // Load mnemonic from environment variable
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
        throw new Error('MNEMONIC is not set in the .env file');
    }

    // Derive keypair from mnemonic
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);

    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::vetting::approve_vetting`,
        arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(VETTING_TABLE_ID),
            tx.pure.address(applicantAddress),
        ],
    });

    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });
        
        return {
            success: true,
            transactionDigest: result.digest,
            applicantAddress,
            message: 'Vetting approved successfully'
        };
    } catch (error) {
        console.error('Error executing transaction:', error);
        throw error;
    }
}