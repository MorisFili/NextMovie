package com.example.Security

import de.mkammerer.argon2.Argon2Factory
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object Hasher {

    private const val ITERATIONS = 2
    private const val MEMORY_KIB = 19 * 1024
    private const val PARALLELISM = 1
    private val format = Regex(
        """[$]argon2id[$]v=19[$]m=([0-9]+),t=([0-9]+),p=([0-9]+)[$][A-Za-z0-9+/]{22}[$][A-Za-z0-9+/]{43}"""
    )

    fun hashPassword(password: String): String {
        val argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id)
        val characters = password.toCharArray()
        try {
            return argon2.hash(ITERATIONS, MEMORY_KIB, PARALLELISM, characters)
        } finally {
            argon2.wipeArray(characters)
        }
    }


    fun verifyPassword(password: String, storedHash: String?): Boolean {
        if (storedHash == null || storedHash.length > 256) return false
        val match = format.matchEntire(storedHash) ?: return false
        val memory = match.groupValues[1].toIntOrNull() ?: return false
        val iterations = match.groupValues[2].toIntOrNull() ?: return false
        val parallelism = match.groupValues[3].toIntOrNull() ?: return false

        // Bound work before handing stored parameters to the native library.
        if (memory !in 8..65_536 || iterations !in 1..10 || parallelism !in 1..4 ||
            memory < 8 * parallelism) return false

        val argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id)
        val characters = password.toCharArray()
        try {
            return argon2.verify(storedHash, characters)
        } finally {
            argon2.wipeArray(characters)
        }
    }

    fun hashEmail(email: String): String {

        val secret = "secret".encodeToByteArray() // demo

        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret, "HmacSHA256"))

        val hash = mac.doFinal(email.trim().lowercase().toByteArray())
        return hash.toHexString()
    }
}
