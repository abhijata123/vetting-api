import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Configuration
const TESTNET_RPC = 'https://fullnode.testnet.sui.io:443';
const AMOUNT_TO_TRANSFER = 20000000n; // 0.02 SUI (in MIST units)

async function transferSui() {
    try {
        // Initialize Sui client
        const client = new SuiClient({ url: TESTNET_RPC });
        
        // SOURCE WALLET - Replace with your source wallet private key (32 bytes)
        const sourcePrivateKeyHex = "YOUR_SOURCE_PRIVATE_KEY_HERE"; // 32-byte private key
        
        // DESTINATION WALLET - Your treasury wallet address
        const treasuryAddress = "0xb3c7d47bda5ebdab8a373203dc13cb0f32463721b79a09a36d99182bac4557b6";
        
        // Create keypair from source private key
        const sourceKeyBytes = new Uint8Array(Buffer.from(sourcePrivateKeyHex, 'hex'));
        const sourceKeypair = Ed25519Keypair.fromSecretKey(sourceKeyBytes);
        const sourceAddress = sourceKeypair.getPublicKey().toSuiAddress();
        
        console.log('Source Address:', sourceAddress);
        console.log('Treasury Address:', treasuryAddress);
        
        // Check source wallet balance
        const sourceBalance = await client.getBalance({
            owner: sourceAddress,
            coinType: '0x2::sui::SUI'
        });
        
        console.log('Source Balance:', sourceBalance.totalBalance, 'MIST');
        
        if (BigInt(sourceBalance.totalBalance) < AMOUNT_TO_TRANSFER) {
            throw new Error(`Insufficient balance. Have: ${sourceBalance.totalBalance}, Need: ${AMOUNT_TO_TRANSFER}`);
        }
        
        // Get coins from source wallet
        const coins = await client.getCoins({
            owner: sourceAddress,
            coinType: '0x2::sui::SUI'
        });
        
        if (coins.data.length === 0) {
            throw new Error('No SUI coins found in source wallet');
        }
        
        // Create transaction
        const txb = new TransactionBlock();
        
        // Add transfer command
        const [coin] = txb.splitCoins(txb.gas, [AMOUNT_TO_TRANSFER]);
        txb.transferObjects([coin], treasuryAddress);
        
        // Sign and execute transaction
        console.log('\\nCreating transaction...');
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
        
        // Check treasury balance after transfer
        const treasuryBalance = await client.getBalance({
            owner: treasuryAddress,
            coinType: '0x2::sui::SUI'
        });
        
        console.log('\\nTreasury Balance After Transfer:', treasuryBalance.totalBalance, 'MIST');
        
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
    console.log('🚀 Starting SUI transfer...');
    
    // First, check if you want to check balances only
    const CHECK_ONLY = true; // Set to false when ready to transfer
    
    if (CHECK_ONLY) {
        console.log('\\n📊 Checking balances only (set CHECK_ONLY to false to transfer)');
        
        // Check treasury balance
        await checkBalance("0xb3c7d47bda5ebdab8a373203dc13cb0f32463721b79a09a36d99182bac4557b6");
        
        // Check source wallet balance
        await checkBalance("0xf7bfb90e6f4a5dca0bde5b999bc10b75cacbfbacdc0fb5f980d72859b049480d");
        
    } else {
        // Actually perform the transfer
        await transferSui();
    }
}

// Run the script
main().catch(console.error);

// Usage instructions:
console.log(`
📋 SETUP INSTRUCTIONS:
1. Install dependencies: npm install @mysten/sui.js
2. Replace YOUR_SOURCE_PRIVATE_KEY_HERE with your source wallet's 32-byte private key
3. Verify the treasury address is correct
4. Set CHECK_ONLY to false when ready to transfer
5. Run: node transfer.js

⚠️  IMPORTANT:
- Make sure your source wallet has sufficient SUI balance
- This transfers 0.02 SUI (20,000,000 MIST) - adjust AMOUNT_TO_TRANSFER if needed
- Always test with small amounts first
`);