import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main minting function for restricted NFTs
export async function mintRestrictedNFT(params) {
    const {
        packageId,
        supplyCapId,
        lineageId,
        counterId,
        recipientAddress,
        nftName,
        badgeCoinId,
        nftVersion = 'BRAAV16'
    } = params;

    // Get sensitive data from environment variables
    const mnemonic = process.env.MNEMONIC;
    const suiNetwork = process.env.SUI_NETWORK;
    const clockObjectId = process.env.CLOCK_OBJECT_ID || '0x6';

    if (!mnemonic) {
        throw new Error('MNEMONIC not set in environment variables');
    }
    if (!suiNetwork) {
        throw new Error('SUI_NETWORK not set in environment variables');
    }

    // Validate recipient address format
    if (!isValidSuiAddress(recipientAddress)) {
        throw new Error('Invalid recipient address format');
    }

    try {
        // Initialize client and keypair
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });
        const nftType = `${packageId}::xoa::${nftVersion}`;

        console.log('🔍 Minting Restricted NFT Parameters:');
        console.log('  Package ID:', packageId);
        console.log('  Supply Cap ID:', supplyCapId);
        console.log('  Lineage ID:', lineageId);
        console.log('  Counter ID:', counterId);
        console.log('  Badge Coin ID:', badgeCoinId);
        console.log('  NFT Type:', nftType);
        console.log('  NFT Name:', nftName);
        console.log('  Recipient:', recipientAddress);

        const tx = new Transaction();

        // Call the restricted NFT minting function
        // Note: This assumes your Move contract has a mint_restricted_and_transfer function
        // You may need to adjust the target function name based on your actual contract
        tx.moveCall({
            target: `${packageId}::braav_public::mint_restricted_and_transfer`,
            arguments: [
                tx.pure.string(nftName), // name
                tx.pure.string(badgeCoinId), // coin_id (badge coin id)
                tx.object(supplyCapId), // supply_cap
                tx.object(lineageId), // lineage
                tx.object(counterId), // counter
                tx.pure.address(recipientAddress), // recipient
                tx.object(clockObjectId), // clock
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

        // Check transaction status
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        // Extract the minted restricted NFT object ID
        const createdRestrictedNFT = result.objectChanges?.find(
            (change) =>
                change.type === 'created' &&
                change.objectType.includes('::braav_public::RestrictedNFT')
        );

        const restrictedNftObjectId = createdRestrictedNFT?.objectId ?? 'Not found';

        return {
            success: true,
            transactionDigest: result.digest,
            restrictedNftObjectId,
            recipientAddress,
            nftName,
            badgeCoinId,
            gasUsed: result.effects?.gasUsed,
            fullResult: result
        };

    } catch (error) {
        console.error('❌ Error minting restricted NFT:', error.message);
        throw error;
    }
}