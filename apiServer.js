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

// 7. Mint NFT
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