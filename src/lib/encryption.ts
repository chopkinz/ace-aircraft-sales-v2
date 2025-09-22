import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'ace-aircraft-encryption-key-32';
const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
	private static getKey(): Buffer {
		return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
	}

	static encrypt(text: string): string {
		if (!text) return '';

		const key = this.getKey();
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipher(ALGORITHM, key);

		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		const authTag = cipher.getAuthTag();

		return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
	}

	static decrypt(encryptedText: string): string {
		if (!encryptedText) return '';

		try {
			const key = this.getKey();
			const parts = encryptedText.split(':');

			if (parts.length !== 3) {
				throw new Error('Invalid encrypted text format');
			}

			const iv = Buffer.from(parts[0], 'hex');
			const authTag = Buffer.from(parts[1], 'hex');
			const encrypted = parts[2];

			const decipher = crypto.createDecipher(ALGORITHM, key);
			decipher.setAuthTag(authTag);

			let decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');

			return decrypted;
		} catch (error) {
			console.error('Decryption error:', error);
			return '';
		}
	}

	static hash(text: string): string {
		return crypto.createHash('sha256').update(text).digest('hex');
	}
}

export default EncryptionService;
