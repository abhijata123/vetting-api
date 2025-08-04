import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.devnet.sui.io/' }); // or mainnet/testnet URL

const digest = 'AT3ztUENkqevcjYfXLpd47tfe43CJWYTkVrN3wG8Ckgd'; // Your transactionDigest

async function getCreatorCapObjectId() {
    try {
        const txDetails = await client.getTransactionBlock({
            digest,
            options: {
                showObjectChanges: true,
            },
        });

        const creatorCap = txDetails.objectChanges?.find((change: any) =>
            change.type === 'created' &&
            change.objectType.includes('::CreatorCap')
        );

        if (creatorCap) {
            console.log('🎯 CreatorCap Object ID:', creatorCap.objectId);
        } else {
            console.log('❌ No CreatorCap object found in this transaction.');
        }
    } catch (error) {
        console.error('Error fetching transaction:', error);
    }
}

getCreatorCapObjectId();
