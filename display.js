import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, SuiObjectChangeCreated } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const GAS_BUDGET = 60000000;

export async function createDisplay(mnemonic, publisherId, packageId, suiNetwork, displayKeys, displayValues, braavVersion) {
  try {
    if (!mnemonic) throw new Error("MNEMONIC not set");
    if (!publisherId) throw new Error("PUBLISHER_ID not set");
    if (!packageId) throw new Error("PACKAGE_ID not set");
    if (!suiNetwork) throw new Error("SUI_NETWORK not set");
    if (!displayKeys || !Array.isArray(displayKeys)) throw new Error("displayKeys must be an array");
    if (!displayValues || !Array.isArray(displayValues)) throw new Error("displayValues must be an array");
    if (displayKeys.length !== displayValues.length) throw new Error("displayKeys and displayValues must have the same length");
    if (!braavVersion) throw new Error("braavVersion is required");

    const client = new SuiClient({ url: suiNetwork });
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const signerAddress = keypair.toSuiAddress();

    const publisherObj = await client.getObject({
      id: publisherId,
      options: { showType: true },
    });
    if (publisherObj.error || !publisherObj.data || publisherObj.data.type !== "0x2::package::Publisher") {
      throw new Error(`Invalid PUBLISHER_ID: ${publisherId} is not a valid Publisher object`);
    }

    const tx = new Transaction();
    const BASE_TYPE = `${packageId}::xoa::${braavVersion}`;
    const NFT_TYPE = `${packageId}::braav_public::NFT<${BASE_TYPE}>`;

    const nftDisplay = tx.moveCall({
      target: "0x2::display::new_with_fields",
      arguments: [
        tx.object(publisherId),
        tx.pure(bcs.vector(bcs.string()).serialize(displayKeys)),
        tx.pure(bcs.vector(bcs.string()).serialize(displayValues)),
      ],
      typeArguments: [NFT_TYPE],
    });

    tx.moveCall({
      target: "0x2::display::update_version",
      arguments: [nftDisplay],
      typeArguments: [NFT_TYPE],
    });

    tx.transferObjects([nftDisplay], signerAddress);
    tx.setGasBudget(GAS_BUDGET);

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
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

    const objectChanges = result.objectChanges?.filter(
      (change): change is SuiObjectChangeCreated => change.type === "created" && change.objectType.includes("0x2::display::Display")
    );

    const nftDisplayId = objectChanges?.find(change => change.objectType.includes("NFT"))?.objectId;

    if (!nftDisplayId) {
      throw new Error("Failed to retrieve NFT Display object ID");
    }

    console.log({ nftDisplayId });

    return { nftDisplayId };
  } catch (error) {
    console.error("Error creating display:", error.message);
    throw error;
  }
}