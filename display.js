import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, SuiObjectChangeCreated } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as dotenv from "dotenv";

dotenv.config();

const client = new SuiClient({ url: process.env.SUI_NETWORK || "" });
const mnemonic: string = process.env.MNEMONIC || "";
const publisherId: string = process.env.PUBLISHER_ID || "";
const packageId: string = process.env.PACKAGE_ID || "";
const GAS_BUDGET = 60000000;

const DISPLAY_FIELDS = {
  keys: ["name", "image_url", "description", "project_url", "coin_story", "video_url"],
  values: [
    "Braav Coin",
    "https://aws.cricketmedia.com/media/20240209194603/ASK2311_22_CouldDragonsExist_Page_1_Image_0001.jpg",
    "A unique Coin from the Braav collection",
    "https://BRAAV.io",
    "Initial release of Braav Coin",
    "https://www.youtube.com/watch?v=xL7IgzlhrxI",
  ],
};

export async function createDisplay(): Promise<{ nftDisplayId: string }> {
  try {
    if (!mnemonic) throw new Error("MNEMONIC not set");
    if (!publisherId) throw new Error("PUBLISHER_ID not set");
    if (!packageId) throw new Error("PACKAGE_ID not set");
    if (!process.env.SUI_NETWORK) throw new Error("SUI_NETWORK not set");

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
    const BASE_TYPE = `${packageId}::xoa::BRAAV3`;
    const NFT_TYPE = `${packageId}::braav_public::NFT<${BASE_TYPE}>`;

    const nftDisplay = tx.moveCall({
      target: "0x2::display::new_with_fields",
      arguments: [
        tx.object(publisherId),
        tx.pure(bcs.vector(bcs.string()).serialize(DISPLAY_FIELDS.keys)),
        tx.pure(bcs.vector(bcs.string()).serialize(DISPLAY_FIELDS.values)),
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
  } catch (error: any) {
    console.error("Error creating display:", error.message);
    throw error;
  }
}

createDisplay().catch((err) => {
  console.error("Failed to create display:", err.message);
  process.exit(1);
});