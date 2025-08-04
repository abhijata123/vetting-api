import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';

dotenv.config();

const mnemonic = process.env.MNEMONIC || '';
const packageId = process.env.PACKAGE_ID || '';
const suiNetwork = process.env.SUI_NETWORK || '';

async function findCapabilityObjects() {
    if (!mnemonic || !packageId || !suiNetwork) {
        throw new Error('Missing required environment variables');
    }

    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const client = new SuiClient({ url: suiNetwork });
    const address = keypair.toSuiAddress();

    console.log('Searching for capability objects for address:', address);
    console.log('Package ID:', packageId);

    // Get all objects owned by the address
    const allObjects = await client.getOwnedObjects({
        owner: address,
        options: { 
            showType: true, 
            showContent: true,
            showOwner: true 
        },
    });

    console.log('\n=== ALL CAPABILITY OBJECTS ===');
    
    const capObjects = allObjects.data.filter(obj => 
        obj.data?.type?.includes('::cap::') || 
        obj.data?.type?.includes('Cap')
    );

    if (capObjects.length === 0) {
        console.log('No capability objects found!');
        
        // Let's also check for any objects from your package
        const packageObjects = allObjects.data.filter(obj => 
            obj.data?.type?.includes(packageId)
        );
        
        console.log('\n=== ALL OBJECTS FROM YOUR PACKAGE ===');
        packageObjects.forEach((obj, index) => {
            console.log(`${index + 1}. Object ID: ${obj.data?.objectId}`);
            console.log(`   Type: ${obj.data?.type}`);
            console.log(`   Owner: ${JSON.stringify(obj.data?.owner)}`);
            console.log('---');
        });
    } else {
        capObjects.forEach((obj, index) => {
            console.log(`${index + 1}. Object ID: ${obj.data?.objectId}`);
            console.log(`   Type: ${obj.data?.type}`);
            console.log(`   Owner: ${JSON.stringify(obj.data?.owner)}`);
            
            if (obj.data?.content) {
                console.log(`   Content: ${JSON.stringify(obj.data.content, null, 2)}`);
            }
            console.log('---');
        });
    }

    // Specifically look for CreatorCap
    const creatorCaps = capObjects.filter(obj => 
        obj.data?.type?.includes('CreatorCap')
    );

    if (creatorCaps.length > 0) {
        console.log('\n🎯 FOUND CREATOR CAP(S):');
        creatorCaps.forEach(cap => {
            console.log(`CreatorCap ID: ${cap.data?.objectId}`);
            console.log(`Type: ${cap.data?.type}`);
        });
    } else {
        console.log('\n❌ NO CREATOR CAP FOUND');
        console.log('You may need to:');
        console.log('1. Create a CreatorCap object first');
        console.log('2. Check if it\'s owned by a different address');
        console.log('3. Verify the package deployment created the right capability objects');
    }

    return { capObjects, creatorCaps };
}

console.log('Searching for capability objects...');
findCapabilityObjects().catch((error) => {
    console.error('Debug failed:', error.message);
    process.exit(1);
});