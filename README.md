 ## Encryption Flow Explanation
To balance performance with maximum security, this application utilizes Hybrid Encryption via the Web Crypto API.
1.	Session Key Generation: When a user sends a message, the client generates a one-time, cryptographically secure 256-bit symmetric key (AES-GCM).
2.	Payload Encryption: The plaintext message is encrypted using this fast AES-GCM key, producing the message ciphertext and an Initialization Vector (IV).
3.	Key Wrapping: Because the recipient does not have the AES key, the sender encrypts (wraps) the AES key itself using the recipient's RSA Public Key (RSA-OAEP).
4.	Transmission: The sender transmits the ciphertext, the IV, and the wrapped AES key to the server.
5.	Decryption: The recipient pulls the bundle from the server, unwraps the AES key using their locally stored RSA Private Key, and uses the recovered AES key to decrypt the actual message.
## Key Management Explanation
The cornerstone of this E2EE implementation is that private keys never leave the device.
• Key Generation: Key pairs (RSA-OAEP, 2048-bit) are generated directly in the browser's memory during registration.
• Public Key Storage: Public keys are exported as spki (converted to Base64URL) and stored on the WhisperBox backend to act as a public directory.
• Private Key Storage: Private keys are stored locally using IndexedDB. They are marked with extractable: false, preventing malicious scripts or cross-site scripting (XSS) attacks from exporting the raw key material.
• Authentication: API access is handled via JWT. The server authenticates the identity of the sender, but has zero cryptographic authority over the data being sent.
## Security Trade-offs
Building a true zero-knowledge client requires sacrificing some modern conveniences:
• No Password or Account Recovery: Because the backend does not hold the private key, if a user clears their browser data or loses their device without manually exporting a backup of their key, all previous message history is permanently lost. The server cannot restore access.
• Device Portability: By default, messages are locked to the specific browser/device where the private key was generated. Multi-device support would require a complex key-syncing mechanism not implemented in this phase.
• Performance Overhead: Asymmetric encryption (RSA) is computationally expensive. We mitigate this by using AES for the payload, but generating key pairs and wrapping keys still introduces slight latency compared to standard plaintext HTTP POST requests.
## Known Limitations
• Lack of Perfect Forward Secrecy (PFS): The current implementation uses static RSA key pairs for wrapping session keys. If an attacker records years of encrypted traffic and eventually compromises a user's RSA private key, they could theoretically unwrap the past AES keys and decrypt historical messages. Implementing something like the Signal Protocol (Double Ratchet) would resolve this but is outside the scope of this stage.
• Metadata Visibility: While the payload is strictly E2EE, the server still registers metadata. The backend knows who is messaging whom, and at what time, even though it cannot read the content.
• IndexedDB Volatility: Browsers may automatically clear IndexedDB storage if the device runs dangerously low on disk space, which would inadvertently wipe the user's private key and lock them out of their message history.
