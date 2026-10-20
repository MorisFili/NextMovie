package com.example.dtos

import com.example.interfaces.Movie
import com.example.interfaces.MovieFilter
import kotlinx.serialization.Serializable

@Serializable
data class QueryRequest(
    val sessionToken: String? = null,
    val filterSettings: MovieFilter? = null
)

@Serializable
data class QueryResponse(
    val sessionToken: String?,
    val movies: List<Movie>,
    val authorized: Boolean
)
