import { SuiClient } from '@mysten/sui/client';
import * as dotenv from 'dotenv';

dotenv.config();

const packageId = process.env.PACKAGE_ID || '';
const suiNetwork = process.env.SUI_NETWORK || '';

async function checkFunctionSignature() {
    const client = new SuiClient({ url: suiNetwork });

    try {
        console.log(`Checking function signature for package: ${packageId}`);
        console.log(`Network: ${suiNetwork}\n`);

        // Get function argument types
        const argTypes = await client.getMoveFunctionArgTypes({
            package: packageId,
            module: 'braav_public',
            function: 'create_supply'
        });

        console.log('=== CREATE_SUPPLY FUNCTION SIGNATURE ===');
        console.log('Expected argument types:');
        argTypes.forEach((argType, index) => {
            console.log(`${index}: ${argType}`);
        });

        // The first argument should tell us what capability type is expected
        if (argTypes.length > 0) {
            console.log(`\n🎯 First argument expects: ${argTypes[0]}`);
            
            if (argTypes[0].includes('AdminCap')) {
                console.log('✅ Function expects AdminCap - you should use your AdminCap!');
                console.log('Your AdminCap ID: 0xe71e3ab2ccf20c48c483f69d4ebbbb6565adbbb654d1aef6aa549a147271e1fc');
            } else if (argTypes[0].includes('CreatorCap')) {
                console.log('❌ Function expects CreatorCap - we need to find it');
            } else {
                console.log('🤔 Function expects a different type of capability');
            }
        }

    } catch (error) {
        console.error('Error checking function signature:', error.message);
        
        // Try alternative approach
        console.log('\nTrying alternative approach...');
        try {
            const modules = await client.getNormalizedMoveModulesByPackage({
                package: packageId
            });

            if (modules.braav_public && modules.braav_public.exposedFunctions.create_supply) {
                const func = modules.braav_public.exposedFunctions.create_supply;
                console.log('\n=== ALTERNATIVE METHOD RESULT ===');
                console.log('Function parameters:', JSON.stringify(func.parameters, null, 2));
                
                if (func.parameters && func.parameters.length > 0) {
                    console.log(`\n🎯 First parameter: ${func.parameters[0]}`);
                }
            }
        } catch (e) {
            console.error('Alternative approach also failed:', e.message);
        }
    }
}

checkFunctionSignature();