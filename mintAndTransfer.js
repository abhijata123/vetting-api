import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

// Load required environment variables
const clock = process.env.CLOCK_OBJECT_ID || '0x6';
const mnemonic = process.env.MNEMONIC || '';
const packageId = process.env.PACKAGE_ID || '';
const supplyCapId = process.env.SUPPLY_CAP_ID || '';
const lineageId = process.env.LINEAGE_ID || '';
const counterId = process.env.COUNTER_ID || '';
const suiNetwork = process.env.SUI_NETWORK || '';
const recipientAddress = process.env.RECIPIENT_ADDRESS || '0x85256c63276f9f62047042948a1c2a4a2694427498ec759c5ac7e34cbd95c6d4';
const nftType = `${packageId}::xoa::BRAAV1`;

async function mintAndTransfer() {
    try {
        // Validate environment variables
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!recipientAddress) throw new Error('RECIPIENT_ADDRESS not set');
        if (!isValidSuiAddress(recipientAddress)) throw new Error(`Invalid recipient address format: ${recipientAddress}`);

        // Initialize client and keypair
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::braav_public::mint_and_transfer`,
            arguments: [
                tx.pure.string("NFT_Example"), // name
                tx.pure.string("COIN_123"), // coin_id
                tx.object(supplyCapId), // supply_cap
                tx.object(lineageId), // lineage
                tx.object(counterId), // counter
                tx.pure.address(recipientAddress), // recipient
                tx.object(clock), // clock
            ],
            typeArguments: [nftType],
        });

        tx.setGasBudget(10000000);

        // Sign and execute the transaction
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showBalanceChanges: true,
                showInput: true,
            },
        });

        // Check transaction status first
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        // Log full transaction result for debugging
        console.log('Full Transaction Result:', JSON.stringify(result, null, 2));

        // Extract the minted NFT object ID
        const createdNFT = result.objectChanges?.find(
            (change) =>
                change.type === 'created' &&
                change.objectType.includes('::braav_public::NFT')
        );

        const nftObjectId = createdNFT?.objectId ?? 'Not found';
        console.log(`✅ Minted and Shared NFT with recipient ${recipientAddress}`);
        console.log(`🎯 NFT Object ID: ${nftObjectId}`);

        return result;
    } catch (error) {
        console.error('❌ Error minting and transferring NFT:', error.message);
        throw error;
    }
}

// Export the function for use in API
export { mintAndTransfer };

// Run the function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    mintAndTransfer().catch((error) => {
        console.error('Script execution failed:', error.message);
        process.exit(1);
    });
}