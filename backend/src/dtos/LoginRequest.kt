package com.example.dtos

import com.example.interfaces.Movie
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val hashmail: String,
    val hashword: String
)

@Serializable
data class LoginResponse(
    val sessionToken: String,
    val movies: List<Movie>,
    val preferences: Preferences?
)
