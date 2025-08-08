import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Configuration
const TESTNET_RPC = 'https://fullnode.testnet.sui.io:443';
const AMOUNT_TO_TRANSFER = 1000000n; // 0.001 SUI (in MIST units) - Small amount to preserve treasury

async function transferSui() {
    try {
        // Initialize Sui client
        const client = new SuiClient({ url: TESTNET_RPC });
        
        // SOURCE WALLET (Treasury) - Replace with your treasury wallet private key (32 bytes)
        const sourcePrivateKeyHex = "YOUR_TREASURY_PRIVATE_KEY_HERE"; // 32-byte private key for 0xb3c7d47bda5ebdab8a373203dc13cb0f32463721b79a09a36d99182bac4557b6
        
        // DESTINATION WALLET - The wallet that needs SUI for gas fees
        const destinationAddress = "0xe64f0fe4f55c05ebe9bb12b6c2be9ab3673ba66d4eb62821c0e3241bc9e18206";
        
        // Create keypair from source private key
        const sourceKeyBytes = new Uint8Array(Buffer.from(sourcePrivateKeyHex, 'hex'));
        const sourceKeypair = Ed25519Keypair.fromSecretKey(sourceKeyBytes);
        const sourceAddress = sourceKeypair.getPublicKey().toSuiAddress();
        
        console.log('Treasury Address (Source):', sourceAddress);
        console.log('Destination Address:', destinationAddress);
        console.log('Amount to Transfer:', AMOUNT_TO_TRANSFER.toString(), 'MIST (0.001 SUI)');
        
        // Check source wallet balance
        const sourceBalance = await client.getBalance({
            owner: sourceAddress,
            coinType: '0x2::sui::SUI'
        });
        
        console.log('Treasury Balance:', sourceBalance.totalBalance, 'MIST');
        
        if (BigInt(sourceBalance.totalBalance) < AMOUNT_TO_TRANSFER) {
            throw new Error(`Insufficient balance. Have: ${sourceBalance.totalBalance}, Need: ${AMOUNT_TO_TRANSFER}`);
        }
        
        // Get coins from treasury wallet
        const coins = await client.getCoins({
            owner: sourceAddress,
            coinType: '0x2::sui::SUI'
        });
        
        if (coins.data.length === 0) {
            throw new Error('No SUI coins found in treasury wallet');
        }
        
        // Create transaction
        const txb = new TransactionBlock();
        
        // Add transfer command
        const [coin] = txb.splitCoins(txb.gas, [AMOUNT_TO_TRANSFER]);
        txb.transferObjects([coin], destinationAddress);
        
        // Sign and execute transaction
        console.log('\nCreating transaction...');
        const result = await client.signAndExecuteTransactionBlock({
            signer: sourceKeypair,
            transactionBlock: txb,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });
        
        console.log('✅ Transfer successful!');
        console.log('Transaction Digest:', result.digest);
        console.log('Gas Used:', result.effects?.gasUsed);
        
        // Check destination balance after transfer
        const destinationBalance = await client.getBalance({
            owner: destinationAddress,
            coinType: '0x2::sui::SUI'
        });
        
        console.log('\nDestination Balance After Transfer:', destinationBalance.totalBalance, 'MIST');
        
        return result;
        
    } catch (error) {
        console.error('❌ Transfer failed:', error.message);
        throw error;
    }
}

// Helper function to check wallet balance
async function checkBalance(address) {
    const client = new SuiClient({ url: TESTNET_RPC });
    const balance = await client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
    });
    console.log(`Balance for ${address}:`, balance.totalBalance, 'MIST');
    return balance;
}

// Main execution
async function main() {
    console.log('🚀 Starting SUI transfer from Treasury to Destination...');
    
    // Set to true to only check balances, false to actually transfer
    const CHECK_ONLY = false; // Set to true if you want to check balances first
    
    if (CHECK_ONLY) {
        console.log('\n📊 Checking balances only (set CHECK_ONLY to false to transfer)');
        
        // Check treasury balance (source)
        console.log('Treasury Wallet:');
        await checkBalance("0xb3c7d47bda5ebdab8a373203dc13cb0f32463721b79a09a36d99182bac4557b6");
        
        // Check destination wallet balance
        console.log('\nDestination Wallet:');
        await checkBalance("0xe64f0fe4f55c05ebe9bb12b6c2be9ab3673ba66d4eb62821c0e3241bc9e18206");
        
    } else {
        // Actually perform the transfer
        console.log('\n💸 Executing transfer...');
        await transferSui();
    }
}

// Run the script
main().catch(console.error);

// Usage instructions:
console.log(`
📋 SETUP INSTRUCTIONS:
1. Install dependencies: npm install @mysten/sui.js
2. Replace YOUR_TREASURY_PRIVATE_KEY_HERE with your treasury wallet's 32-byte private key
3. Verify the destination address is correct: 0xe64f0fe4f55c05ebe9bb12b6c2be9ab3673ba66d4eb62821c0e3241bc9e18206
4. Set CHECK_ONLY to true first to check balances, then false to transfer
5. Run: node transferSuiTokens.js

⚠️  IMPORTANT:
- Make sure your treasury wallet has sufficient SUI balance
- This transfers only 0.001 SUI (1,000,000 MIST) to preserve treasury funds
- Always test with small amounts first
- You need the 32-byte private key for the treasury wallet: 0xb3c7d47bda5ebdab8a373203dc13cb0f32463721b79a09a36d99182bac4557b6
`);