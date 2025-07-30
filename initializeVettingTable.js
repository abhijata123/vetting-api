import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function initializeVettingTable() {
    const PACKAGE_ID = process.env.PACKAGE_ID;
    if (!PACKAGE_ID) throw new Error('PACKAGE_ID not set in .env');

    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) throw new Error('MNEMONIC not set in .env');

    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const tx = new Transaction();

    // Assuming AdminCap is already created and its ID is stored in .env
    const ADMIN_CAP_ID = process.env.ADMIN_CAP;
    if (!ADMIN_CAP_ID) throw new Error('ADMIN_CAP_ID not set in .env');

    tx.moveCall({
        target: `${PACKAGE_ID}::vetting::initialize_vetting_table`,
        arguments: [tx.object(ADMIN_CAP_ID)],
    });

    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showObjectChanges: true },
        });

        console.log('Transaction executed:', JSON.stringify(result, null, 2));

        const vettingTableChange = result.objectChanges?.find(
            (change) =>
                change.type === 'created' && change.objectType.includes('VettingTable')
        );

        const vettingTableId = vettingTableChange?.objectId;
        if (!vettingTableId) throw new Error('VettingTable object not found');

        console.log('VettingTable Object ID:', vettingTableId);
        return vettingTableId;
    } catch (error) {
        console.error('Error executing transaction:', error);
        throw error;
    }
}

initializeVettingTable().catch((error) => {
    console.error('Initialization failed:', error);
    process.exit(1);
});