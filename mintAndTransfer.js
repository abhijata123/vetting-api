import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

// Load required environment variables
const clock = process.env.CLOCK_OBJECT_ID || '0x6';
const mnemonic = process.env.MNEMONIC || '';
const packageId = '0x96d85be3bc79ea5677851da858e1185a2461af41a0998dbe691770671ecc9c07'; // Hardcoded demo value
const supplyCapId = '0x8087f5c6ecda7a6ae4343674a28d7b94693881cc377ffec4777c8da908ecfa19'; // Hardcoded demo value
const lineageId = '0xf8400d8a1d49fa0b4497c437221fad985acd112f8c64980bfd70cc7101e351a9'; // Hardcoded demo value
const counterId = '0x90aa4067839f55cb2e5b5bacb6489f60e6eee11f5ec607f3e95f492cac75f7c8'; // Hardcoded demo value
const badgeCoinId = 'BADGE_001'; // Badge coin identifier
const suiNetwork = process.env.SUI_NETWORK || '';
const recipientAddress = '0x85256c63276f9f62047042948a1c2a4a2694427498ec759c5ac7e34cbd95c6d4'; // Hardcoded demo value
// Fixed: Changed from BRAAV1 to BRAAV16 to match your transaction
const nftType = `${packageId}::xoa::BRAAV16`;

async function mintAndTransfer() {
    try {
        // Validate environment variables
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!supplyCapId) throw new Error('SUPPLY_CAP_ID not set');
        if (!lineageId) throw new Error('LINEAGE_ID not set');
        if (!counterId) throw new Error('COUNTER_ID not set');
        if (!badgeCoinId) throw new Error('BADGE_COIN_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!recipientAddress) throw new Error('RECIPIENT_ADDRESS not set');
        if (!isValidSuiAddress(recipientAddress)) throw new Error(`Invalid recipient address format: ${recipientAddress}`);

        // Initialize client and keypair
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        // Debug: Log all parameters being used
        console.log('🔍 Minting Parameters:');
        console.log('  Package ID:', packageId);
        console.log('  Supply Cap ID:', supplyCapId);
        console.log('  Lineage ID:', lineageId);
        console.log('  Counter ID:', counterId);
        console.log('  Badge Coin ID:', badgeCoinId);
        console.log('  NFT Type:', nftType);
        console.log('  Recipient:', recipientAddress);

        // Debug: Let's first inspect the supply cap object to understand its type
        console.log('🔍 Checking supply cap object...');
        try {
            const supplyCapObject = await client.getObject({
                id: supplyCapId,
                options: { showType: true, showContent: true }
            });
            console.log('Supply Cap Object Type:', supplyCapObject.data?.type);
            console.log('Supply Cap Object Content:', JSON.stringify(supplyCapObject.data?.content, null, 2));
        } catch (debugError) {
            console.log('Could not fetch supply cap object for debugging:', debugError.message);
        }

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::braav_public::mint_and_transfer`,
            arguments: [
                tx.pure.string("NFT_Example"), // name
                tx.pure.string(badgeCoinId), // coin_id (using badge coin id)
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
        console.log(`🏷️  Badge Coin ID used: ${badgeCoinId}`);

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