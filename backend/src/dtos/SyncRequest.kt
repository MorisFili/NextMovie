package com.example.dtos

import kotlinx.serialization.Serializable

@Serializable
data class SyncRequest (
    val sessionToken: String? = null,
    val preferences: Preferences
)

@Serializable
data class Preferences (
    val likedMovies: Map<Int, Boolean?> = emptyMap()
)

@Serializable
data class MoviePreference(val liked: Boolean)
