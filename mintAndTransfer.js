import express from 'express';
import cors from 'cors';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request validation middleware
const validateMintRequest = (req, res, next) => {
    const requiredFields = [
        'mnemonic',
        'packageId',
        'supplyCapId',
        'lineageId',
        'counterId',
        'suiNetwork',
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
        mnemonic,
        packageId,
        supplyCapId,
        lineageId,
        counterId,
        suiNetwork,
        recipientAddress,
        nftName,
        badgeCoinId,
        clockObjectId = '0x6',
        nftVersion = 'BRAAV16'
    } = params;

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

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'NFT Minting API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Get API documentation
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'NFT Minting API Documentation',
        endpoints: {
            'GET /health': 'Health check',
            'GET /api/docs': 'API documentation',
            'POST /api/mint': 'Mint NFT'
        },
        mintEndpoint: {
            url: 'POST /api/mint',
            description: 'Mint and transfer NFT to recipient',
            requiredFields: [
                'mnemonic',
                'packageId',
                'supplyCapId',
                'lineageId',
                'counterId',
                'suiNetwork',
                'recipientAddress',
                'nftName',
                'badgeCoinId'
            ],
            optionalFields: [
                'clockObjectId (default: "0x6")',
                'nftVersion (default: "BRAAV16")'
            ],
            example: {
                mnemonic: 'your_mnemonic_phrase_here',
                packageId: '0x96d85be3bc79ea5677851da858e1185a2461af41a0998dbe691770671ecc9c07',
                supplyCapId: '0x8087f5c6ecda7a6ae4343674a28d7b94693881cc377ffec4777c8da908ecfa19',
                lineageId: '0xf8400d8a1d49fa0b4497c437221fad985acd112f8c64980bfd70cc7101e351a9',
                counterId: '0x90aa4067839f55cb2e5b5bacb6489f60e6eee11f5ec607f3e95f492cac75f7c8',
                suiNetwork: 'https://fullnode.testnet.sui.io:443',
                recipientAddress: '0x85256c63276f9f62047042948a1c2a4a2694427498ec759c5ac7e34cbd95c6d4',
                nftName: 'My Awesome NFT',
                badgeCoinId: 'BADGE_001',
                clockObjectId: '0x6',
                nftVersion: 'BRAAV16'
            }
        }
    });
});

// Main minting endpoint
app.post('/api/mint', validateMintRequest, async (req, res) => {
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

// Get full transaction details endpoint
app.post('/api/mint/detailed', validateMintRequest, async (req, res) => {
    try {
        const result = await mintNFT(req.body);

        res.json({
            success: true,
            message: 'NFT minted and transferred successfully',
            data: result,
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        availableEndpoints: [
            'GET /health',
            'GET /api/docs',
            'POST /api/mint',
            'POST /api/mint/detailed'
        ],
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 NFT Minting API Server running on port ${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🎯 Mint Endpoint: http://localhost:${PORT}/api/mint`);
});

export default app;