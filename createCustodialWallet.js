import crypto from 'crypto';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';
import { Buffer } from 'buffer';

export async function createCustodialWallet(userDetails) {
  try {
    const userID = userDetails.id;
    const createdAt = userDetails.created_at;
    const userSecret = userDetails.secret_key;

    // Create a more robust seed using HMAC instead of simple concatenation
    const walletSecret = process.env.WALLET_SECRET || 'default_secret_change_in_production';
    const seedData = `${userID}:${createdAt}:${userSecret}`;
    
    const seed = crypto
      .createHmac('sha256', walletSecret)
      .update(seedData)
      .digest();

    // Ensure the seed is exactly 32 bytes for Ed25519
    const privateKeyBytes = seed.slice(0, 32);
    
    // Create keypair from the 32-byte seed
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    
    // Get private key in different formats
    const secretKeyArray = keypair.getSecretKey();
    const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
    const privateKeyBase64 = Buffer.from(privateKeyBytes).toString('base64');
    
    // Get public key and address
    const publicKey = keypair.getPublicKey();
    const address = publicKey.toSuiAddress();
    
    // Generate mnemonic-like representation (12 words from the seed)
    const mnemonic = generateMnemonicFromSeed(privateKeyBytes);

    return {
      address,
      publicKey: publicKey.toBase64(),
      privateKey: privateKeyHex,
      privateKeyBase64,
      mnemonic,
      // Additional info for debugging
      seedHex: Buffer.from(seed.slice(0, 32)).toString('hex')
    };
  } catch (err) {
    console.error('Wallet creation error:', err);
    throw err;
  }
}

// Helper function to generate a mnemonic-like representation
function generateMnemonicFromSeed(seed) {
  // Simple word list (in production, use BIP39 wordlist)
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
    'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
    'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
    'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
    'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
    'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
    'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
    'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
    'arcade', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed',
    'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art',
    'article', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist',
    'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract',
    'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average',
    'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward'
  ];

  const mnemonicWords = [];
  for (let i = 0; i < 12; i++) {
    const index = seed[i * 2] % words.length;
    mnemonicWords.push(words[index]);
  }
  
  return mnemonicWords.join(' ');
}

// Alternative function using standard mnemonic generation
export async function createCustodialWalletWithStandardMnemonic(userDetails) {
  try {
    // Generate a standard Ed25519 keypair first
    const keypair = new Ed25519Keypair();
    
    // Get private key and address
    const secretKeyArray = keypair.getSecretKey();
    const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
    const privateKeyBase64 = Buffer.from(privateKeyBytes).toString('base64');
    const publicKey = keypair.getPublicKey();
    const address = publicKey.toSuiAddress();
    
    // For a truly random wallet, you'd typically use a BIP39 library
    // But for demonstration, we'll generate deterministic words
    const userID = userDetails.id;
    const createdAt = userDetails.created_at;
    const userSecret = userDetails.secret_key;
    const walletSecret = process.env.WALLET_SECRET || 'default_secret_change_in_production';
    
    const seedData = `${userID}:${createdAt}:${userSecret}`;
    const deterministicSeed = crypto
      .createHmac('sha256', walletSecret)
      .update(seedData)
      .digest();
    
    const mnemonic = generateMnemonicFromSeed(deterministicSeed);

    return {
      address,
      publicKey: publicKey.toBase64(),
      privateKey: privateKeyHex,
      privateKeyBase64,
      mnemonic,
      // Store user mapping for deterministic recreation
      userMapping: {
        userId: userID,
        createdAt: createdAt,
        secretHash: crypto.createHash('sha256').update(userSecret).digest('hex')
      }
    };
  } catch (err) {
    console.error('Wallet creation error:', err);
    throw err;
  }
}

// Test both approaches
const testUser = {
  id: 'user123',
  created_at: new Date().toISOString(),
  secret_key: crypto.randomBytes(32).toString('hex'),
};

console.log('=== Deterministic Custodial Wallet ===');
createCustodialWallet(testUser).then(result => {
  console.log('Address:', result.address);
  console.log('Private Key:', result.privateKey);
  console.log('Mnemonic:', result.mnemonic);
  console.log('Public Key:', result.publicKey);
}).catch(console.error);

console.log('\n=== Standard Approach (for comparison) ===');
createCustodialWalletWithStandardMnemonic(testUser).then(result => {
  console.log('Address:', result.address);
  console.log('Private Key:', result.privateKey);
  console.log('Mnemonic:', result.mnemonic);
  console.log('Public Key:', result.publicKey);
}).catch(console.error);