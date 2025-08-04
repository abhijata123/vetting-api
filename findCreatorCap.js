import { SuiClient } from '@mysten/sui/client';
import * as dotenv from 'dotenv';

dotenv.config();

const suiNetwork = process.env.SUI_NETWORK || '';
const client = new SuiClient({ url: suiNetwork });

// Replace this with your actual deployment transaction digest
const digest = '2WbzbDiW2GQhkgJxUKe2aH4XoJQ99MbB9MNjPdbPLhDU';

async function getCreatorCapObjectId() {
    try {
        console.log(`Searching in transaction: ${digest}`);
        console.log(`Network: ${suiNetwork}`);
        
        const txDetails = await client.getTransactionBlock({
            digest,
            options: {
                showObjectChanges: true,
            },
        });

        console.log('\n=== ALL CREATED OBJECTS ===');
        const createdObjects = txDetails.objectChanges?.filter(change => change.type === 'created') || [];
        
        createdObjects.forEach((obj, index) => {
            console.log(`${index + 1}. ${obj.objectType}`);
            console.log(`   ID: ${obj.objectId}`);
            console.log('---');
        });

        const creatorCap = txDetails.objectChanges?.find((change) =>
            change.type === 'created' &&
            change.objectType.includes('CreatorCap')
        );

        if (creatorCap) {
            console.log('\n🎯 CreatorCap Object ID:', creatorCap.objectId);
            console.log('Object Type:', creatorCap.objectType);
            console.log('\n✅ Add this to your .env file:');
            console.log(`CREATOR_CAP_ID=${creatorCap.objectId}`);
        } else {
            console.log('\n❌ No CreatorCap object found in this transaction.');
            console.log('\n💡 Try these steps:');
            console.log('1. Make sure you have the correct deployment transaction digest');
            console.log('2. Check if the transaction created any other capability objects above');
            console.log('3. The function might expect a different type of capability');
        }
    } catch (error) {
        console.error('Error fetching transaction:', error);
    }
}

getCreatorCapObjectId();