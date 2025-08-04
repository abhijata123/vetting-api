import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
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