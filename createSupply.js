import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

dotenv.config();

const mnemonic = process.env.MNEMONIC || '';
const packageId = process.env.PACKAGE_ID || '';
const suiNetwork = process.env.SUI_NETWORK || '';
const creatorCapId = process.env.CREATOR_CAP_ID || '';

async function fetchWithRetry(client, objectId, retries = 10, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const obj = await client.getObject({
                id: objectId,
                options: { showContent: true },
            });
            if (obj.data) return obj;
        } catch (e) {
            if (e.code !== 'notExists') throw e;
            console.log('Object ' + objectId + ' not yet available, retrying... (' + (retries - i - 1) + ' left)');
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error(`Object ${objectId} not found after ${retries} retries`);
}

async function createSupply(limit, braavTypeArg) {
    const braavNumber = braavTypeArg.match(/BRAAV\d+/)?.[0] || 'Unknown BRAAV';

    try {
        if (!mnemonic) throw new Error('MNEMONIC not set');
        if (!packageId) throw new Error('PACKAGE_ID not set');
        if (!suiNetwork) throw new Error('SUI_NETWORK not set');
        if (!creatorCapId) throw new Error('CREATOR_CAP_ID not set');

        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });

        const braavType = `${packageId}::braav_public::BRAAV<${braavTypeArg}>`;

        // Check for existing BRAAV objects
        const objects = await client.getOwnedObjects({
            owner: keypair.toSuiAddress(),
            filter: { StructType: braavType },
            options: { showType: true },
        });

        if (objects.data.length > 0) {
            throw new Error(`${braavNumber} already used for packageId ${packageId}.`);
        }

        const tx = new Transaction();
        const braavObj = tx.moveCall({
            target: `${packageId}::braav_public::create_supply`,
            arguments: [
                tx.object(creatorCapId), // Pass CreatorCap object
                tx.pure.u64(limit),
            ],
            typeArguments: [braavTypeArg],
        });

        tx.transferObjects([braavObj], keypair.toSuiAddress());
        tx.setGasBudget(10000000);

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

        console.log('Full Transaction Result:', JSON.stringify(result, null, 2));

        const createdBraav = result.objectChanges?.find(
            (change) => change.type === 'created' && change.objectType.includes('::braav_public::BRAAV')
        );

        const createdLineage = result.objectChanges?.find(
            (change) => change.type === 'created' && change.objectType.includes('::braav_public::Lineage')
        );

        const createdCounter = result.objectChanges?.find(
            (change) => change.type === 'created' && change.owner.AddressOwner === keypair.toSuiAddress() && change.objectType.includes('::counter::Counter')
        );

        // Fetch CounterId from BRAAV object to verify
        let counterId = 'Not found';
        if (createdBraav?.objectId) {
            const braavObject = await fetchWithRetry(client, createdBraav.objectId);
            const content = braavObject.data?.content;
            if (content?.dataType === 'moveObject' && content.fields?.counter) {
                counterId = content.fields.counter;
            }
        }

        console.log({
            SupplyCapId: createdBraav?.objectId ?? 'Not found',
            LineageObjectId: createdLineage?.objectId ?? 'Not found',
            CounterId: createdCounter?.objectId ?? counterId,
        });

        return result;
    } catch (error) {
        console.error(`Error creating ${braavNumber} supply:`, error.message);
        throw error;
    }
}

console.log('Attempting to create supply...');
createSupply(10, `${packageId}::xoa::BRAAV1`).catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});