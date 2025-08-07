import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { isValidSuiAddress } from "@mysten/sui/utils";

const GAS_BUDGET = 10000000;

export async function mintRestrictedNFT(mnemonic, packageId, suiNetwork, supplyCapId, creatorCapId, lineageId, counterId, recipientAddress, nftName, coinId, braavVersion) {
  try {
    if (!mnemonic) throw new Error("MNEMONIC not set");
    if (!packageId) throw new Error("PACKAGE_ID not set");
    if (!suiNetwork) throw new Error("SUI_NETWORK not set");
    if (!supplyCapId) throw new Error("SUPPLY_CAP_ID not set");
    if (!creatorCapId) throw new Error("CREATOR_CAP_ID not set");
    if (!lineageId) throw new Error("LINEAGE_ID not set");
    if (!counterId) throw new Error("COUNTER_ID not set");
    if (!recipientAddress) throw new Error("RECIPIENT_ADDRESS not set");
    if (!isValidSuiAddress(recipientAddress)) throw new Error(`Invalid recipient address: ${recipientAddress}`);
    if (!nftName) throw new Error("nftName is required");
    if (!coinId) throw new Error("coinId is required");
    if (!braavVersion) throw new Error("braavVersion is required");

    const client = new SuiClient({ url: suiNetwork });
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    
    const nftType = `${packageId}::xoa::${braavVersion}`;
    
    console.log('🔍 Minting Restricted NFT Parameters:');
    console.log('  Package ID:', packageId);
    console.log('  Supply Cap ID:', supplyCapId);
    console.log('  Creator Cap ID:', creatorCapId);
    console.log('  Lineage ID:', lineageId);
    console.log('  Counter ID:', counterId);
    console.log('  NFT Type:', nftType);
    console.log('  NFT Name:', nftName);
    console.log('  Coin ID:', coinId);
    console.log('  Recipient:', recipientAddress);

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${packageId}::braav_public::mint_restricted`,
      arguments: [
        tx.object(creatorCapId), // _creator
        tx.object(supplyCapId), // supply_cap
        tx.object(lineageId), // lineage
        tx.object(counterId), // counter
        tx.pure.address(recipientAddress), // recipient
        tx.pure.string(nftName), // name
        tx.pure.string(coinId), // coin_id
        tx.object('0x6'), // clock
      ],
      typeArguments: [nftType],
    });

    tx.setGasBudget(GAS_BUDGET);

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { 
        showObjectChanges: true, 
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
    });

    if (result.effects?.status.status !== "success") {
      throw new Error(`Transaction failed: ${result.effects?.status.error || JSON.stringify(result, null, 2)}`);
    }

    // Extract the minted RestrictedNFT object ID
    const createdRestrictedNFT = result.objectChanges?.find(
      (change) => change.type === 'created' && change.objectType.includes('::braav_public::RestrictedNFT')
    );

    const restrictedNftObjectId = createdRestrictedNFT?.objectId;

    if (!restrictedNftObjectId) {
      throw new Error("Failed to retrieve RestrictedNFT object ID");
    }

    console.log(`✅ Minted non-transferable RestrictedNFT for ${recipientAddress}`);
    console.log(`🆔 RestrictedNFT Object ID: ${restrictedNftObjectId}`);
    console.log(`ℹ️  Note: Only admins can transfer this NFT using restricted_transfer.`);

    return {
      success: true,
      transactionDigest: result.digest,
      restrictedNftObjectId,
      recipientAddress,
      nftName,
      coinId,
      braavVersion,
      gasUsed: result.effects?.gasUsed,
    };

  } catch (error) {
    console.error("❌ Error minting RestrictedNFT:", error.message);
    throw error;
  }
}