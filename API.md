# Dash Platform Extension API Documentation

This document provides detailed information about the APIs available in the Dash Platform Extension.

## Overview

The Dash Platform Extension provides two types of APIs:

1. **Public API** - For web pages to interact with the extension
2. **Private API** - For internal extension communication

## Message Format

All API communications use a standardized message format:

```typescript
interface EventData {
  id: string;
  context: 'dash-platform-extension';
  type: 'request' | 'response';
  method: string;
  payload: any;
  error: string | null;
}
```

## Public API

The Public API allows web pages to interact with the extension through `window.postMessage()`.

### CONNECT_APP

Connects a DApp to the extension.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'CONNECT_APP';
  payload: {
    appName: string;
    appUrl: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'CONNECT_APP';
  payload: {
    connected: boolean;
    appId: string;
  };
  error: null;
}
```

**Example:**
```javascript
window.postMessage({
  id: 'connect-1',
  context: 'dash-platform-extension',
  type: 'request',
  method: 'CONNECT_APP',
  payload: {
    appName: 'My DApp',
    appUrl: window.location.origin
  }
}, '*');
```

### REQUEST_STATE_TRANSITION_APPROVAL

Requests approval for a state transition from the user.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'REQUEST_STATE_TRANSITION_APPROVAL';
  payload: {
    stateTransition: any; // Dash Platform state transition object
    appName: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'REQUEST_STATE_TRANSITION_APPROVAL';
  payload: {
    approved: boolean;
    stateTransitionId: string;
  };
  error: null;
}
```

**Example:**
```javascript
window.postMessage({
  id: 'approval-1',
  context: 'dash-platform-extension',
  type: 'request',
  method: 'REQUEST_STATE_TRANSITION_APPROVAL',
  payload: {
    stateTransition: myStateTransition,
    appName: 'My DApp'
  }
}, '*');
```

## Private API

The Private API is used for internal extension communication through Chrome's messaging system.

### Extension Management

#### GET_STATUS

Gets the current status of the extension.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'GET_STATUS';
  payload: {};
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'GET_STATUS';
  payload: {
    isInitialized: boolean;
    hasPassword: boolean;
    currentIdentity: string | null;
    currentWallet: string | null;
  };
  error: null;
}
```

#### SETUP_PASSWORD

Sets up password protection for the extension.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'SETUP_PASSWORD';
  payload: {
    password: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'SETUP_PASSWORD';
  payload: {
    success: boolean;
  };
  error: null;
}
```

#### CHECK_PASSWORD

Verifies the provided password.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'CHECK_PASSWORD';
  payload: {
    password: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'CHECK_PASSWORD';
  payload: {
    isValid: boolean;
  };
  error: null;
}
```

### Identity Management

#### CREATE_IDENTITY

Creates a new identity.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'CREATE_IDENTITY';
  payload: {
    privateKey: string; // WIF format
    name?: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'CREATE_IDENTITY';
  payload: {
    identityId: string;
    name: string;
    createdAt: string;
  };
  error: null;
}
```

#### GET_AVAILABLE_IDENTITIES

Lists all available identities.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'GET_AVAILABLE_IDENTITIES';
  payload: {};
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'GET_AVAILABLE_IDENTITIES';
  payload: {
    identities: Array<{
      id: string;
      name: string;
      createdAt: string;
      isActive: boolean;
    }>;
  };
  error: null;
}
```

#### GET_CURRENT_IDENTITY

Gets the currently active identity.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'GET_CURRENT_IDENTITY';
  payload: {};
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'GET_CURRENT_IDENTITY';
  payload: {
    identity: {
      id: string;
      name: string;
      createdAt: string;
      balance?: string;
    } | null;
  };
  error: null;
}
```

#### SWITCH_IDENTITY

Switches to a different identity.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'SWITCH_IDENTITY';
  payload: {
    identityId: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'SWITCH_IDENTITY';
  payload: {
    success: boolean;
    identityId: string;
  };
  error: null;
}
```

### Wallet Management

#### CREATE_WALLET

Creates a new wallet.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'CREATE_WALLET';
  payload: {
    name: string;
    type: 'HD' | 'SIMPLE';
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'CREATE_WALLET';
  payload: {
    walletId: string;
    name: string;
    type: string;
    address: string;
  };
  error: null;
}
```

#### SWITCH_WALLET

Switches to a different wallet.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'SWITCH_WALLET';
  payload: {
    walletId: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'SWITCH_WALLET';
  payload: {
    success: boolean;
    walletId: string;
  };
  error: null;
}
```

### State Transition Management

#### GET_STATE_TRANSITION

Gets details of a specific state transition.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'GET_STATE_TRANSITION';
  payload: {
    stateTransitionId: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'GET_STATE_TRANSITION';
  payload: {
    stateTransition: {
      id: string;
      type: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      data: any;
      createdAt: string;
      appName?: string;
    };
  };
  error: null;
}
```

#### APPROVE_STATE_TRANSITION

Approves a state transition.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'APPROVE_STATE_TRANSITION';
  payload: {
    stateTransitionId: string;
    password?: string; // Required if password protection is enabled
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'APPROVE_STATE_TRANSITION';
  payload: {
    success: boolean;
    transactionId?: string;
  };
  error: null;
}
```

#### REJECT_STATE_TRANSITION

Rejects a state transition.

**Request:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'request';
  method: 'REJECT_STATE_TRANSITION';
  payload: {
    stateTransitionId: string;
    reason?: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: 'REJECT_STATE_TRANSITION';
  payload: {
    success: boolean;
  };
  error: null;
}
```

## Error Handling

All API responses may include error information:

```typescript
{
  id: string;
  context: 'dash-platform-extension';
  type: 'response';
  method: string;
  payload: null;
  error: string; // Error message
}
```

### Common Error Types

- `PayloadNotValidError` - Invalid request payload
- `IdentityAlreadyExistsError` - Identity already exists
- `CurrentIdentityNotSetError` - No active identity
- `WalletNotFoundError` - Wallet not found
- `StateTransitionAlreadyExistsError` - State transition already exists

## Dash Platform SDK Integration

The extension injects a Dash Platform SDK instance into web pages, providing access to:

- Identity management
- Document creation and management
- State transition creation and signing
- Contract interactions

### Example Usage

```javascript
// Access the SDK
const { dashPlatformSDK } = window;

// Create a document
const document = await dashPlatformSDK.documents.create(
  dataContractId,
  documentType,
  documentData,
  nonce,
  identityId
);

// Create a state transition
const transition = new dashPlatformSDK.wasm.DocumentCreateTransitionWASM(
  document,
  nonce,
  documentType
);

// Sign the transition
await dashPlatformSDK.signer.signStateTransition(transition);
```

## Security Notes

- All private keys are stored securely in the extension's encrypted storage
- State transitions require explicit user approval
- Password protection can be enabled for additional security
- The extension only exposes necessary APIs to web pages
- Private key operations are performed within the extension context

## Best Practices

1. Always handle errors gracefully
2. Validate payloads before sending requests
3. Use unique IDs for each request
4. Implement proper timeout handling
5. Test with both approved and rejected scenarios
6. Follow the message format exactly
7. Use appropriate error handling for network issues 