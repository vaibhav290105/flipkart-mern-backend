"use strict";

const crypto = require('crypto');

class PaytmChecksum {
  static encrypt(input, key) {
    try {
      if (!input || !key) throw new Error("Input data or key is missing.");
      const cipher = crypto.createCipheriv('AES-128-CBC', key, PaytmChecksum.iv);
      let encrypted = cipher.update(input, 'binary', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error.message);
      throw new Error("Failed to encrypt data.");
    }
  }

  static decrypt(encrypted, key) {
    try {
      if (!encrypted) throw new Error("Encrypted data is undefined or null.");
      if (!key) throw new Error("Key is undefined or null.");
      
      const decipher = crypto.createDecipheriv('AES-128-CBC', key, PaytmChecksum.iv);
      let decrypted = decipher.update(encrypted, 'base64', 'binary');
      decrypted += decipher.final('binary');
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null; // Gracefully return null if decryption fails
    }
  }

  static async generateSignature(params, key) {
    try {
      if (typeof params !== "object" && typeof params !== "string") {
        throw new Error(`Expected string or object, but received ${typeof params}.`);
      }
      if (typeof params !== "string") {
        params = PaytmChecksum.getStringByParams(params);
      }
      return await PaytmChecksum.generateSignatureByString(params, key);
    } catch (error) {
      console.error("Error generating signature:", error.message);
      throw error;
    }
  }

  static verifySignature(params, key, checksum) {
    try {
      if (typeof params !== "object" && typeof params !== "string") {
        throw new Error(`Expected string or object, but received ${typeof params}.`);
      }
      if (params.hasOwnProperty("CHECKSUMHASH")) {
        delete params.CHECKSUMHASH;
      }
      if (typeof params !== "string") {
        params = PaytmChecksum.getStringByParams(params);
      }
      return PaytmChecksum.verifySignatureByString(params, key, checksum);
    } catch (error) {
      console.error("Error verifying signature:", error.message);
      throw error;
    }
  }

  static async generateSignatureByString(params, key) {
    try {
      const salt = await PaytmChecksum.generateRandomString(4);
      return PaytmChecksum.calculateChecksum(params, key, salt);
    } catch (error) {
      console.error("Error generating signature by string:", error.message);
      throw error;
    }
  }

  static verifySignatureByString(params, key, checksum) {
    try {
      const paytmHash = PaytmChecksum.decrypt(checksum, key);
      if (!paytmHash) {
        console.error("Decrypted hash is null or undefined.");
        return false;
      }
      const salt = paytmHash.substr(paytmHash.length - 4);
      return paytmHash === PaytmChecksum.calculateHash(params, salt);
    } catch (error) {
      console.error("Error verifying signature by string:", error.message);
      return false; // Gracefully return false if verification fails
    }
  }

  static generateRandomString(length) {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(Math.ceil((length * 3) / 4), (err, buf) => {
        if (err) {
          console.error("Error generating random string:", err.message);
          return reject(err);
        }
        resolve(buf.toString("base64").substring(0, length));  // Limit length to match the requirement
      });
    });
  }

  static getStringByParams(params) {
    const data = {};
    Object.keys(params).sort().forEach(key => {
      data[key] = params[key] && params[key].toLowerCase() !== "null" ? params[key] : "";
    });
    return Object.values(data).join('|');
  }

  static calculateHash(params, salt) {
    const finalString = params + "|" + salt;
    return crypto.createHash('sha256').update(finalString).digest('hex') + salt;
  }

  static calculateChecksum(params, key, salt) {
    const hashString = PaytmChecksum.calculateHash(params, salt);
    return PaytmChecksum.encrypt(hashString, key);
  }
}

PaytmChecksum.iv = '@@@@&&&&####$$$$';  // Ensure this is consistent for both encryption and decryption
module.exports = PaytmChecksum;
