import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function statusOfVetting(applicantAddress) {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    // Validate environment variables
    if (PACKAGE_ID === 'YOUR_PACKAGE_ID' || VETTING_TABLE_ID === 'YOUR_VETTING_TABLE_ID') {
        throw new Error('PACKAGE_ID or VETTING_TABLE_ID not set in .env file');
    }

    const tx = new Transaction();
    const [status] = tx.moveCall({
        target: `${PACKAGE_ID}::vetting::status_of_vetting`,
        arguments: [
            tx.object(VETTING_TABLE_ID),
            tx.pure.address(applicantAddress),
        ],
    });

    try {
        const result = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: applicantAddress,
        });

        if (result.effects.status.status !== 'success') {
            return {
                applicantAddress,
                hasApplied: false,
                isApproved: null,
                message: 'This address has not applied'
            };
        }

        // Check return values from the Move function
        const returnValues = result.results?.[0]?.returnValues;
        if (!returnValues || !returnValues[0]) {
            return {
                applicantAddress,
                hasApplied: false,
                isApproved: null,
                message: 'This address has not applied'
            };
        }

        const optionValue = returnValues[0][0];
        if (optionValue.length === 1 && optionValue[0] === 0) {
            return {
                applicantAddress,
                hasApplied: false,
                isApproved: null,
                message: 'This address has not applied'
            };
        } else if (optionValue.length === 2 && optionValue[0] === 1) {
            const isApproved = optionValue[1] === 1;
            return {
                applicantAddress,
                hasApplied: true,
                isApproved,
                message: `Approval status: ${isApproved}`
            };
        } else {
            return {
                applicantAddress,
                hasApplied: false,
                isApproved: null,
                message: 'Unexpected return value'
            };
        }

    } catch (error) {
        console.error('Error querying status:', error.message);
        return {
            applicantAddress,
            hasApplied: false,
            isApproved: null,
            message: 'This address has not applied',
            error: error.message
        };
    }
}