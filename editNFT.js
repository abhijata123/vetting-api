import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { isValidSuiAddress } from "@mysten/sui/utils";

const GAS_BUDGET = 10000000;

export async function editNFT(mnemonic, packageId, suiNetwork, nftObjectId, creatorCapId, newName, newCoinId, braavVersion) {
  try {
    if (!mnemonic) throw new Error("MNEMONIC not set");
    if (!packageId) throw new Error("PACKAGE_ID not set");
    if (!suiNetwork) throw new Error("SUI_NETWORK not set");
    if (!nftObjectId) throw new Error("NFT_OBJECT_ID not set");
    if (!creatorCapId) throw new Error("CREATOR_CAP_ID not set");
    if (!newName) throw new Error("newName is required");
    if (!newCoinId) throw new Error("newCoinId is required");
    if (!braavVersion) throw new Error("braavVersion is required");
    if (!isValidSuiAddress(nftObjectId)) throw new Error(`Invalid NFT object ID: ${nftObjectId}`);
    if (!isValidSuiAddress(creatorCapId)) throw new Error(`Invalid CreatorCap ID: ${creatorCapId}`);

    const client = new SuiClient({ url: suiNetwork });
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    
    const nftType = `${packageId}::xoa::${braavVersion}`;
    
    console.log('🔍 Editing NFT Parameters:');
    console.log('  Package ID:', packageId);
    console.log('  NFT Object ID:', nftObjectId);
    console.log('  Creator Cap ID:', creatorCapId);
    console.log('  NFT Type:', nftType);
    console.log('  New Name:', newName);
    console.log('  New Coin ID:', newCoinId);

    const tx = new Transaction();

    // Update NFT name and coin_id
    tx.moveCall({
      target: `${packageId}::braav_public::update_nft`,
      arguments: [
        tx.object(creatorCapId), // CreatorCap
        tx.object(nftObjectId), // NFT object (now shared)
        tx.pure.string(newName), // new name
        tx.pure.string(newCoinId), // new coin_id
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
        showBalanceChanges: true,
        showInput: true,
      },
    });

    if (result.effects?.status.status !== "success") {
      throw new Error(`Transaction failed: ${result.effects?.status.error || JSON.stringify(result, null, 2)}`);
    }

    console.log(`✅ Updated NFT ${nftObjectId} with name: ${newName}, coin_id: ${newCoinId}`);

    return {
      success: true,
      transactionDigest: result.digest,
      nftObjectId,
      newName,
      newCoinId,
      braavVersion,
      gasUsed: result.effects?.gasUsed,
      fullResult: result
    };

  } catch (error) {
    console.error("❌ Error updating NFT:", error.message);
    throw error;
  }
}