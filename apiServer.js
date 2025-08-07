import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { approveVetting } from './lib/approveVetting.js';
import { statusOfVetting } from './lib/statusOfVetting.js';
import { submitForVetting } from './lib/submitForVetting.js';
import { initializeVettingTable } from './lib/initializeVettingTable.js';
import { createCustodialWallet, createCustodialWalletWithStandardMnemonic } from './createCustodialWallet.js';
import { createSupply } from './createSupply.js';
import { createDisplay } from './display.js';
import { createRestrictedDisplay } from './restrictedDisplay.js';
import { mintRestrictedNFT } from './mintRestrictedNFT.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request validation middleware for minting
const validateMintRequest = (req, res, next) => {
    const requiredFields = [
        'packageId',
        'supplyCapId',
        'lineageId',
        'counterId',
        'recipientAddress',
        'nftName',
        'badgeCoinId'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            missingFields,
            requiredFields
        });
    }

    // Validate recipient address format
    if (!isValidSuiAddress(req.body.recipientAddress)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid recipient address format',
            recipientAddress: req.body.recipientAddress
        });
    }

    next();
};

// Request validation middleware for restricted NFT minting
const validateRestrictedMintRequest = (req, res, next) => {
    const requiredFields = [
        'packageId',
        'supplyCapId',
        'creatorCapId',
        'lineageId',
        'counterId',
        'recipientAddress',
        'nftName',
        'coinId',
        'braavVersion'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            missingFields,
            requiredFields
        });
    }

    // Validate recipient address format
    if (!isValidSuiAddress(req.body.recipientAddress)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid recipient address format',
            recipientAddress: req.body.recipientAddress
        });
    }

    next();
};

// Main minting function
async function mintNFT(params) {
    const {
        packageId,
        supplyCapId,
        lineageId,
        counterId,
        recipientAddress,
        nftName,
        badgeCoinId,
        nftVersion = 'BRAAV16'
    } = params;

    // Get sensitive data from environment variables
    const mnemonic = process.env.MNEMONIC;
    const suiNetwork = process.env.SUI_NETWORK;
    const clockObjectId = process.env.CLOCK_OBJECT_ID || '0x6';

    if (!mnemonic) {
        throw new Error('MNEMONIC not set in environment variables');
    }
    if (!suiNetwork) {
        throw new Error('SUI_NETWORK not set in environment variables');
    }

    try {
        // Initialize client and keypair
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const client = new SuiClient({ url: suiNetwork });
        const nftType = `${packageId}::xoa::${nftVersion}`;

        console.log('🔍 Minting Parameters:');
        console.log('  Package ID:', packageId);
        console.log('  Supply Cap ID:', supplyCapId);
        console.log('  Lineage ID:', lineageId);
        console.log('  Counter ID:', counterId);
        console.log('  Badge Coin ID:', badgeCoinId);
        console.log('  NFT Type:', nftType);
        console.log('  NFT Name:', nftName);
        console.log('  Recipient:', recipientAddress);

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::braav_public::mint_and_transfer`,
            arguments: [
                tx.pure.string(nftName), // name
                tx.pure.string(badgeCoinId), // coin_id (badge coin id)
                tx.object(supplyCapId), // supply_cap
                tx.object(lineageId), // lineage
                tx.object(counterId), // counter
                tx.pure.address(recipientAddress), // recipient
                tx.object(clockObjectId), // clock
            ],
            typeArguments: [nftType],
        });

        tx.setGasBudget(10000000);

        // Sign and execute the transaction
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

        // Check transaction status
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        // Extract the minted NFT object ID
        const createdNFT = result.objectChanges?.find(
            (change) =>
                change.type === 'created' &&
                change.objectType.includes('::braav_public::NFT')
        );

        const nftObjectId = createdNFT?.objectId ?? 'Not found';

        return {
            success: true,
            transactionDigest: result.digest,
            nftObjectId,
            recipientAddress,
            nftName,
            badgeCoinId,
            gasUsed: result.effects?.gasUsed,
            fullResult: result
        };

    } catch (error) {
        console.error('❌ Error minting NFT:', error.message);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Sui Vetting API Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes

// 1. Approve Vetting
app.post('/api/approve-vetting', async (req, res) => {
    try {
        const { applicantAddress } = req.body;
        
        if (!applicantAddress) {
            return res.status(400).json({ 
                error: 'applicantAddress is required in request body' 
            });
        }

        const result = await approveVetting(applicantAddress);
        res.json(result);
    } catch (error) {
        console.error('Approve vetting error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/approve-vetting'
        });
    }
});

// 2. Check Vetting Status
app.post('/api/status-of-vetting', async (req, res) => {
    try {
        const { applicantAddress } = req.body;
        
        if (!applicantAddress) {
            return res.status(400).json({ 
                error: 'applicantAddress is required in request body' 
            });
        }

        const result = await statusOfVetting(applicantAddress);
        res.json(result);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/status-of-vetting'
        });
    }
});

// 3. Submit for Vetting
app.post('/api/submit-for-vetting', async (req, res) => {
    try {
        const { walletCredentials } = req.body;
        
        // walletCredentials should be provided - if not provided, will use env variables as fallback
        const result = await submitForVetting(walletCredentials);
        res.json(result);
    } catch (error) {
        console.error('Submit for vetting error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/submit-for-vetting'
        });
    }
});

// 4. Initialize Vetting Table
app.post('/api/initialize-vetting-table', async (req, res) => {
    try {
        const result = await initializeVettingTable();
        res.json(result);
    } catch (error) {
        console.error('Initialize vetting table error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/initialize-vetting-table'
        });
    }
});

// 5. Create Custodial Wallet
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { userDetails, useStandardMnemonic } = req.body;
        
        if (!userDetails || !userDetails.id) {
            return res.status(400).json({ 
                error: 'userDetails with id is required in request body' 
            });
        }

        // Add default values if not provided
        const completeUserDetails = {
            id: userDetails.id,
            created_at: userDetails.created_at || new Date().toISOString(),
            secret_key: userDetails.secret_key || crypto.randomBytes(32).toString('hex'),
            ...userDetails
        };

        let result;
        if (useStandardMnemonic) {
            result = await createCustodialWalletWithStandardMnemonic(completeUserDetails);
        } else {
            result = await createCustodialWallet(completeUserDetails);
        }
        
        res.json({
            success: true,
            wallet: result,
            message: 'Custodial wallet created successfully'
        });
    } catch (error) {
        console.error('Create wallet error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/create-wallet'
        });
    }
});

// 6. Create Supply
app.post('/api/create-supply', async (req, res) => {
    try {
        const { supplyLimit, tokenTypeName } = req.body;
        
        if (typeof supplyLimit === 'undefined' || !tokenTypeName) {
            return res.status(400).json({ 
                error: 'supplyLimit (number) and tokenTypeName (string) are required in request body' 
            });
        }

        // Validate supplyLimit is a number
        if (typeof supplyLimit !== 'number' || supplyLimit <= 0) {
            return res.status(400).json({ 
                error: 'supplyLimit must be a positive number' 
            });
        }

        const result = await createSupply(supplyLimit, tokenTypeName);
        res.json({
            success: true,
            message: 'Supply created successfully',
            result: result
        });
    } catch (error) {
        console.error('Create supply error:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/create-supply'
        });
    }
});

// 8. Create Display
app.post('/api/create-display', async (req, res) => {
    try {
        const { displayKeys, displayValues, braavVersion } = req.body;
        
        // Validate required fields
        if (!displayKeys || !Array.isArray(displayKeys)) {
            return res.status(400).json({ 
                error: 'displayKeys is required and must be an array' 
            });
        }
        
        if (!displayValues || !Array.isArray(displayValues)) {
            return res.status(400).json({ 
                error: 'displayValues is required and must be an array' 
            });
        }
        
        if (displayKeys.length !== displayValues.length) {
            return res.status(400).json({ 
                error: 'displayKeys and displayValues must have the same length' 
            });
        }
        
        if (!braavVersion || typeof braavVersion !== 'string') {
            return res.status(400).json({ 
                error: 'braavVersion is required and must be a string' 
            });
        }
        
        // Get environment variables
        const mnemonic = process.env.MNEMONIC;
        const publisherId = process.env.PUBLISHER_ID;
        const packageId = process.env.PACKAGE_ID;
        const suiNetwork = process.env.SUI_NETWORK;
        
        if (!mnemonic) {
            return res.status(500).json({ 
                error: 'MNEMONIC not configured in environment variables' 
            });
        }
        
        if (!publisherId) {
            return res.status(500).json({ 
                error: 'PUBLISHER_ID not configured in environment variables' 
            });
        }
        
        if (!packageId) {
            return res.status(500).json({ 
                error: 'PACKAGE_ID not configured in environment variables' 
            });
        }
        
        if (!suiNetwork) {
            return res.status(500).json({ 
                error: 'SUI_NETWORK not configured in environment variables' 
            });
        }
        
        console.log('🎨 Creating display for:', {
            braavVersion,
            displayKeys,
            timestamp: new Date().toISOString()
        });
        
        const result = await createDisplay(
            mnemonic,
            publisherId,
            packageId,
            suiNetwork,
            displayKeys,
            displayValues,
            braavVersion
        );
        
        console.log('✅ Display created successfully:', {
            nftDisplayId: result.nftDisplayId
        });
        
        res.json({
            success: true,
            message: 'Display created successfully',
            data: {
                nftDisplayId: result.nftDisplayId,
                braavVersion,
                displayKeys,
                displayValues
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Create Display Error:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to create display',
            error: error.message,
            endpoint: '/api/create-display',
            timestamp: new Date().toISOString()
        });
    }
});

// 10. Create Restricted Display
app.post('/api/create-restricted-display', async (req, res) => {
    try {
        const { displayKeys, displayValues, braavVersion } = req.body;
        
        // Validate required fields
        if (!displayKeys || !Array.isArray(displayKeys)) {
            return res.status(400).json({ 
                error: 'displayKeys is required and must be an array' 
            });
        }
        
        if (!displayValues || !Array.isArray(displayValues)) {
            return res.status(400).json({ 
                error: 'displayValues is required and must be an array' 
            });
        }
        
        if (displayKeys.length !== displayValues.length) {
            return res.status(400).json({ 
                error: 'displayKeys and displayValues must have the same length' 
            });
        }
        
        if (!braavVersion || typeof braavVersion !== 'string') {
            return res.status(400).json({ 
                error: 'braavVersion is required and must be a string' 
            });
        }
        
        // Get environment variables
        const mnemonic = process.env.MNEMONIC;
        const publisherId = process.env.PUBLISHER_ID;
        const packageId = process.env.PACKAGE_ID;
        const suiNetwork = process.env.SUI_NETWORK;
        
        if (!mnemonic) {
            return res.status(500).json({ 
                error: 'MNEMONIC not configured in environment variables' 
            });
        }
        
        if (!publisherId) {
            return res.status(500).json({ 
                error: 'PUBLISHER_ID not configured in environment variables' 
            });
        }
        
        if (!packageId) {
            return res.status(500).json({ 
                error: 'PACKAGE_ID not configured in environment variables' 
            });
        }
        
        if (!suiNetwork) {
            return res.status(500).json({ 
                error: 'SUI_NETWORK not configured in environment variables' 
            });
        }
        
        console.log('🎨 Creating restricted display for:', {
            braavVersion,
            displayKeys,
            timestamp: new Date().toISOString()
        });
        
        const result = await createRestrictedDisplay(
            mnemonic,
            publisherId,
            packageId,
            suiNetwork,
            displayKeys,
            displayValues,
            braavVersion
        );
        
        console.log('✅ Restricted display created successfully:', {
            restrictedNftDisplayId: result.restrictedNftDisplayId
        });
        
        res.json({
            success: true,
            message: 'Restricted display created successfully',
            data: {
                restrictedNftDisplayId: result.restrictedNftDisplayId,
                braavVersion,
                displayKeys,
                displayValues
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Create Restricted Display Error:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to create restricted display',
            error: error.message,
            endpoint: '/api/create-restricted-display',
            timestamp: new Date().toISOString()
        });
    }
});

// 9. Mint NFT
app.post('/api/mint-nft', validateMintRequest, async (req, res) => {
    try {
        console.log('🚀 Received minting request:', {
            nftName: req.body.nftName,
            badgeCoinId: req.body.badgeCoinId,
            recipientAddress: req.body.recipientAddress,
            timestamp: new Date().toISOString()
        });

        const result = await mintNFT(req.body);

        console.log('✅ NFT minted successfully:', {
            transactionDigest: result.transactionDigest,
            nftObjectId: result.nftObjectId
        });

        res.json({
            success: true,
            message: 'NFT minted and transferred successfully',
            data: {
                transactionDigest: result.transactionDigest,
                nftObjectId: result.nftObjectId,
                recipientAddress: result.recipientAddress,
                nftName: result.nftName,
                badgeCoinId: result.badgeCoinId,
                gasUsed: result.gasUsed
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ API Error:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to mint NFT',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 11. Mint Restricted NFT
app.post('/api/mint-restricted-nft', validateRestrictedMintRequest, async (req, res) => {
    try {
        console.log('🚀 Received restricted NFT minting request:', {
            nftName: req.body.nftName,
            coinId: req.body.coinId,
            recipientAddress: req.body.recipientAddress,
            braavVersion: req.body.braavVersion,
            timestamp: new Date().toISOString()
        });

        // Get environment variables
        const mnemonic = process.env.MNEMONIC;
        const suiNetwork = process.env.SUI_NETWORK;
        
        if (!mnemonic) {
            return res.status(500).json({ 
                error: 'MNEMONIC not configured in environment variables' 
            });
        }
        
        if (!suiNetwork) {
            return res.status(500).json({ 
                error: 'SUI_NETWORK not configured in environment variables' 
            });
        }

        const result = await mintRestrictedNFT(
            mnemonic,
            req.body.packageId,
            suiNetwork,
            req.body.supplyCapId,
            req.body.creatorCapId,
            req.body.lineageId,
            req.body.counterId,
            req.body.recipientAddress,
            req.body.nftName,
            req.body.coinId,
            req.body.braavVersion
        );

        console.log('✅ Restricted NFT minted successfully:', {
            transactionDigest: result.transactionDigest,
            restrictedNftObjectId: result.restrictedNftObjectId
        });

        res.json({
            success: true,
            message: 'Restricted NFT minted successfully',
            data: {
                transactionDigest: result.transactionDigest,
                restrictedNftObjectId: result.restrictedNftObjectId,
                recipientAddress: result.recipientAddress,
                nftName: result.nftName,
                coinId: result.coinId,
                braavVersion: result.braavVersion,
                gasUsed: result.gasUsed
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Restricted NFT Minting Error:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to mint restricted NFT',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all available endpoints
app.get('/api/endpoints', (req, res) => {
    res.json({
        endpoints: [
            {
                method: 'GET',
                path: '/health',
                description: 'Health check endpoint'
            },
            {
                method: 'POST',
                path: '/api/approve-vetting',
                description: 'Approve a vetting application',
                body: { applicantAddress: 'string (required)' }
            },
            {
                method: 'POST',
                path: '/api/status-of-vetting',
                description: 'Check vetting status of an address',
                body: { applicantAddress: 'string (required)' }
            },
            {
                method: 'POST',
                path: '/api/submit-for-vetting',
                description: 'Submit an address for vetting',
                body: { 
                    walletCredentials: {
                        mnemonic: 'string (optional)',
                        privateKey: 'string (optional)'
                    }
                }
            },
            {
                method: 'POST',
                path: '/api/initialize-vetting-table',
                description: 'Initialize a new vetting table'
            },
            {
                method: 'POST',
                path: '/api/create-wallet',
                description: 'Create a custodial wallet',
                body: { 
                    userDetails: { id: 'string (required)', created_at: 'string', secret_key: 'string' },
                    useStandardMnemonic: 'boolean (optional)'
                }
            },
            {
                method: 'POST',
                path: '/api/create-supply',
                description: 'Create a new supply for a token type',
                body: { 
                    supplyLimit: 'number (required)',
                    tokenTypeName: 'string (required)'
                }
            },
            {
                method: 'POST',
                path: '/api/mint-nft',
                description: 'Mint and transfer NFT to recipient',
                body: { 
                    packageId: 'string (required)',
                    supplyCapId: 'string (required)',
                    lineageId: 'string (required)',
                    counterId: 'string (required)',
                    recipientAddress: 'string (required)',
                    nftName: 'string (required)',
                    badgeCoinId: 'string (required)',
                    nftVersion: 'string (optional, default: BRAAV16)'
                }
            },
            {
                method: 'POST',
                path: '/api/create-display',
                description: 'Create display metadata for NFT type',
                body: { 
                    displayKeys: 'array of strings (required) - e.g., ["name", "image_url", "description", "project_url", "coin_story", "video_url"]',
                    displayValues: 'array of strings (required) - corresponding values for the keys',
                    braavVersion: 'string (required) - e.g., "BRAAV3", "BRAAV16", "BRAAV17"'
                }
            },
            {
                method: 'POST',
                path: '/api/create-restricted-display',
                description: 'Create restricted display metadata for RestrictedNFT type',
                body: { 
                    displayKeys: 'array of strings (required) - e.g., ["name", "image_url", "description", "project_url", "coin_story", "video_url"]',
                    displayValues: 'array of strings (required) - corresponding values for the keys',
                    braavVersion: 'string (required) - e.g., "BRAAV3", "BRAAV16", "BRAAV17"'
                }
            },
            {
                method: 'POST',
                path: '/api/mint-restricted-nft',
                description: 'Mint a restricted NFT (non-transferable by users)',
                body: { 
                    packageId: 'string (required)',
                    supplyCapId: 'string (required)',
                    creatorCapId: 'string (required)',
                    lineageId: 'string (required)',
                    counterId: 'string (required)',
                    recipientAddress: 'string (required)',
                    nftName: 'string (required)',
                    coinId: 'string (required)',
                    braavVersion: 'string (required) - e.g., "BRAAV3", "BRAAV16", "BRAAV17"'
                }
            },
            {
                method: 'GET',
                path: '/api/endpoints',
                description: 'Get list of all available endpoints'
            }
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: '/api/endpoints'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sui Vetting API Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 Available endpoints: http://localhost:${PORT}/api/endpoints`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;