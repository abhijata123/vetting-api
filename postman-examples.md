# Postman Testing Guide for Sui Vetting API

## Server Setup
1. Start the server: `npm start`
2. Server will run on `http://localhost:3000`

## API Endpoints for Postman Testing

### 1. Health Check
**GET** `http://localhost:3000/health`
- No body required
- Returns server status

### 2. Get Available Endpoints
**GET** `http://localhost:3000/api/endpoints`
- No body required
- Returns list of all available endpoints with descriptions

### 3. Check Vetting Status
**POST** `http://localhost:3000/api/status-of-vetting`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "applicantAddress": "0x125141673adbafe3f54afafe03eed2c0a1c246fb079408ced0454d8767e67c84"
}
```

### 4. Submit for Vetting (using environment credentials)
**POST** `http://localhost:3000/api/submit-for-vetting`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON) - Option 1 (use env variables):**
```json
{}
```

**Body (JSON) - Option 2 (provide wallet credentials):**
```json
{
  "walletCredentials": {
    "mnemonic": "your mnemonic phrase here"
  }
}
```

**Body (JSON) - Option 3 (provide private key):**
```json
{
  "walletCredentials": {
    "privateKey": "737569707269766b65793171716b6373647a3267633968613530647079726e376c66646e386b34363437383875637a6b326d3967787339786c37756834367432363774793473"
  }
}
```

### 5. Approve Vetting
**POST** `http://localhost:3000/api/approve-vetting`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "applicantAddress": "0x125141673adbafe3f54afafe03eed2c0a1c246fb079408ced0454d8767e67c84"
}
```

### 6. Initialize Vetting Table
**POST** `http://localhost:3000/api/initialize-vetting-table`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{}
```

### 7. Create Custodial Wallet
**POST** `http://localhost:3000/api/create-wallet`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON) - Basic:**
```json
{
  "userDetails": {
    "id": "user123"
  }
}
```

**Body (JSON) - Complete:**
```json
{
  "userDetails": {
    "id": "user123",
    "created_at": "2024-01-15T10:30:00Z",
    "secret_key": "some-secret-key-here"
  },
  "useStandardMnemonic": false
}
```

### 8. Create Supply
**POST** `http://localhost:3000/api/create-supply`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "supplyLimit": 100,
  "tokenTypeName": "BRAAV1"
}
```

**Body (JSON) - Another example:**
```json
{
  "supplyLimit": 1000,
  "tokenTypeName": "BRAAV2"
}
```

## Expected Response Formats

### Success Response Example:
```json
{
  "success": true,
  "transactionDigest": "ABC123...",
  "applicantAddress": "0x125141673adbafe3f54afafe03eed2c0a1c246fb079408ced0454d8767e67c84",
  "message": "Operation completed successfully"
}
```

### Error Response Example:
```json
{
  "error": "Error message here",
  "endpoint": "/api/endpoint-name"
}
```

### Status Check Response Example:
```json
{
  "applicantAddress": "0x125141673adbafe3f54afafe03eed2c0a1c246fb079408ced0454d8767e67c84",
  "hasApplied": true,
  "isApproved": false,
  "message": "Approval status: false"
}
```

### Create Supply Response Example:
```json
{
  "success": true,
  "message": "Supply created successfully",
  "result": {
    "digest": "ABC123...",
    "objectChanges": [...],
    "effects": {...}
  }
}
```

## Testing Workflow

1. **Start with Health Check** - Verify server is running
2. **Create a Wallet** (optional) - Generate new wallet credentials
3. **Submit for Vetting** - Submit an address for vetting
4. **Check Status** - Verify the submission was successful
5. **Approve Vetting** - Approve the submitted address (requires admin credentials)
6. **Check Status Again** - Verify the approval was successful
7. **Create Supply** - Create a new token supply with specified limit and type

## Important Notes

- Make sure your `.env` file is properly configured with all required variables
- The server uses environment variables for wallet credentials by default
- You can override credentials by providing them in the request body
- All POST requests require `Content-Type: application/json` header
- Error responses include the endpoint name for easier debugging