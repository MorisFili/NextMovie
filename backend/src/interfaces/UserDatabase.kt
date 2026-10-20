package com.example.interfaces

import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient

@Serializable
data class User(
    val id: Int,
    val email: String,
    @Transient val hashWord: String? = null
)

interface UserDatabase {
    /** hashWord is the supplied password; implementations verify it against the stored hash. */
    fun authenticate(email: String, hashWord: String): User?
    fun createUser(email: String, hashWord: String): User?
    fun delete(id: Int)
}
