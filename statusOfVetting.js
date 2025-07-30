import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function statusOfVetting(applicantAddress) {
    const PACKAGE_ID = process.env.PACKAGE_ID || 'YOUR_PACKAGE_ID';
    const VETTING_TABLE_ID = process.env.VETTING_TABLE_ID || 'YOUR_VETTING_TABLE_ID';
    const client = new SuiClient({ url: process.env.SUI_NETWORK || 'https://fullnode.testnet.sui.io' });

    // Validate environment variables
    if (PACKAGE_ID === 'YOUR_PACKAGE_ID' || VETTING_TABLE_ID === 'YOUR_VETTING_TABLE_ID') {
        console.error('Error: PACKAGE_ID or VETTING_TABLE_ID not set in .env file');
        return null;
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
            console.log(`This address has not applied: ${applicantAddress}`);
            return null;
        }

        // Check return values from the Move function
        const returnValues = result.results?.[0]?.returnValues;
        if (!returnValues || !returnValues[0]) {
            console.log(`This address has not applied: ${applicantAddress}`);
            return null;
        }

        const optionValue = returnValues[0][0];
        if (optionValue.length === 1 && optionValue[0] === 0) {
            console.log(`This address has not applied: ${applicantAddress}`);
            return null;
        } else if (optionValue.length === 2 && optionValue[0] === 1) {
            const isApproved = optionValue[1] === 1;
            console.log(`Approval status for ${applicantAddress}: ${isApproved}`);
            return isApproved;
        } else {
            console.log(`Unexpected return value for ${applicantAddress}`);
            return null;
        }

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error querying status:', error.message);
        } else {
            console.error('Error querying status:', error);
        }
        console.log(`This address has not applied: ${applicantAddress}`);
        return null;
    }
}

statusOfVetting('0x125141673adbafe3f54afafe03eed2c0a1c246fb079408ced0454d8767e67c84')
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });