import { editRestrictedNFT } from './editRestrictedNFT.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default values for testing - IMPORTANT: Use a valid RestrictedNFT Object ID
const DEFAULT_VALUES = {
  nftObjectId: "0x14cc2cd12f694dcfb9ff2f9c6e0babe996e8fd86f8d3d493bfac10fe9dc7957a", // Replace with actual RestrictedNFT ID
  newName: "Updated Restricted Gold Coin",
  newCoinId: "restricted_coin_456",
  braavVersion: "BRAAV16"
};

async function runEditRestrictedNFT() {
  console.log('🚀 Starting Restricted NFT Edit Script...');
  console.log('📋 Using default test values:');
  console.log('  Restricted NFT Object ID:', DEFAULT_VALUES.nftObjectId);
  console.log('  New Name:', DEFAULT_VALUES.newName);
  console.log('  New Coin ID:', DEFAULT_VALUES.newCoinId);
  console.log('  BRAAV Version:', DEFAULT_VALUES.braavVersion);
  console.log('');

  try {
    // Get environment variables
    const mnemonic = process.env.MNEMONIC;
    const packageId = process.env.PACKAGE_ID;
    const suiNetwork = process.env.SUI_NETWORK;
    const creatorCapId = process.env.CREATOR_CAP_ID;

    // Validate environment variables
    const missingEnvVars = [];
    if (!mnemonic) missingEnvVars.push('MNEMONIC');
    if (!packageId) missingEnvVars.push('PACKAGE_ID');
    if (!suiNetwork) missingEnvVars.push('SUI_NETWORK');
    if (!creatorCapId) missingEnvVars.push('CREATOR_CAP_ID');

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }

    console.log('✅ Environment variables loaded successfully');
    console.log('  Package ID:', packageId);
    console.log('  Creator Cap ID:', creatorCapId);
    console.log('  SUI Network:', suiNetwork);
    console.log('  Mnemonic:', mnemonic ? '***loaded***' : 'NOT SET');
    console.log('');

    console.log('🔄 Calling editRestrictedNFT function...');

    // Call the editRestrictedNFT function
    const result = await editRestrictedNFT(
      mnemonic,
      packageId,
      suiNetwork,
      DEFAULT_VALUES.nftObjectId,
      creatorCapId,
      DEFAULT_VALUES.newName,
      DEFAULT_VALUES.newCoinId,
      DEFAULT_VALUES.braavVersion
    );

    console.log('');
    console.log('🎉 Restricted NFT Edit Successful!');
    console.log('📄 Transaction Details:');
    console.log('  Transaction Digest:', result.transactionDigest);
    console.log('  Restricted NFT Object ID:', result.restrictedNftObjectId);
    console.log('  New Name:', result.newName);
    console.log('  New Coin ID:', result.newCoinId);
    console.log('  BRAAV Version:', result.braavVersion);
    console.log('  Gas Used:', result.gasUsed);
    console.log('');
    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('');
    console.error('❌ Restricted NFT Edit Failed!');
    console.error('🔍 Error Details:');
    console.error('  Message:', error.message);
    
    if (error.stack) {
      console.error('  Stack Trace:');
      console.error(error.stack);
    }
    
    console.error('');
    console.error('💡 Troubleshooting Tips:');
    console.error('  1. Verify your .env file contains all required variables');
    console.error('  2. Check that the Restricted NFT Object ID exists and is valid');
    console.error('  3. Ensure the Object ID corresponds to a RestrictedNFT, not a regular NFT');
    console.error('  4. Ensure your wallet has sufficient SUI for gas fees');
    console.error('  5. Confirm the Creator Cap ID has permission to edit this RestrictedNFT');
    console.error('  6. Verify the BRAAV version matches the RestrictedNFT type');
    console.error('  7. If you get a TypeMismatch error, you may need to mint a RestrictedNFT first');
    
    process.exit(1);
  }
}

// Handle script termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Run the script
console.log('='.repeat(60));
console.log('🔧 Restricted NFT Edit Test Script');
console.log('='.repeat(60));

runEditRestrictedNFT().catch((error) => {
  console.error('❌ Script execution failed:', error.message);
  process.exit(1);
});