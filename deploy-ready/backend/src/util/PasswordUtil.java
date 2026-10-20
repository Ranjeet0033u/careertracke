package util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

/**
 * UNIT V & SECURITY: Secure Password Hashing using PBKDF2WithHmacSHA256.
 * 
 * Rules followed:
 *  - Passwords are NEVER stored as plain text.
 *  - Uses PBKDF2 (Password-Based Key Derivation Function 2) with HMAC-SHA256.
 *  - Generates a cryptographically strong, unique random salt per user (16 bytes) via SecureRandom.
 *  - Work factor: 65,536 iterations.
 *  - Storage format: <iterations>:<base64-salt>:<base64-derived-hash>.
 *  - Compares hashes in constant time via MessageDigest.isEqual() to prevent timing attacks.
 *  - Passwords are never printed or logged.
 */
public class PasswordUtil {

    private static final int ITERATIONS = 65536;
    private static final int KEY_LENGTH = 256; // bits
    private static final int SALT_BYTES = 16;  // 128-bit random salt
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Generates a unique 16-byte salt and computes PBKDF2WithHmacSHA256 hash.
     * 
     * @param plainPassword Raw password provided by the user
     * @return Formatted string: "iterations:base64Salt:base64Hash"
     */
    public static String hashPassword(String plainPassword) {
        if (plainPassword == null || plainPassword.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }

        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);

        byte[] hash = computePBKDF2(plainPassword.toCharArray(), salt, ITERATIONS, KEY_LENGTH);

        String saltBase64 = Base64.getEncoder().encodeToString(salt);
        String hashBase64 = Base64.getEncoder().encodeToString(hash);

        return ITERATIONS + ":" + saltBase64 + ":" + hashBase64;
    }

    /**
     * Verifies an entered plain-text password against a stored PBKDF2 hash.
     * Uses constant-time byte comparison to protect against side-channel timing attacks.
     * 
     * @param plainPassword The password entered during sign-in
     * @param storedHash    The hash record stored in MySQL (iterations:salt:hash)
     * @return true if password matches, false otherwise
     */
    public static boolean verifyPassword(String plainPassword, String storedHash) {
        if (plainPassword == null || storedHash == null || storedHash.isEmpty()) {
            return false;
        }

        String[] parts = storedHash.split(":");
        if (parts.length != 3) {
            return false; // Malformed hash format
        }

        try {
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = Base64.getDecoder().decode(parts[1]);
            byte[] expectedHash = Base64.getDecoder().decode(parts[2]);

            byte[] actualHash = computePBKDF2(plainPassword.toCharArray(), salt, iterations, expectedHash.length * 8);

            // Constant-time array comparison
            return MessageDigest.isEqual(expectedHash, actualHash);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Computes the raw PBKDF2 byte array using standard javax.crypto API.
     */
    private static byte[] computePBKDF2(char[] password, byte[] salt, int iterations, int keyLengthBits) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyLengthBits);
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return skf.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("PBKDF2WithHmacSHA256 algorithm not available in current JRE", e);
        }
    }
}
