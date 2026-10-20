package com.example.interfaces

import kotlinx.serialization.Serializable

@Serializable
data class Movie(
    val nmid: Int,
    val title: String,
    val year: Int? = null,
    val rated: String? = null,
    val released: String? = null,
    val runtime: Int? = null,
    val tmdbPosterPath: String? = null,
    val trailers: List<Trailer> = emptyList(),
    val plot: String? = null,
    val imdbid: String? = null,
    val people: List<Person> = emptyList(),
    val genres: List<Genre> = emptyList(),
    val languages: List<Language> = emptyList(),
    val imdbRating: Double? = null
)

@Serializable
data class Trailer(
    val key: String,
    val source: String,
    val language: String? = null
)

@Serializable
data class Person(
    val id: Int,
    val name: String,
    val imdbid: String? = null,
    val role: String? = null
)

@Serializable
data class Genre(val id: Int, val name: String)

@Serializable
data class Language(val id: Int, val name: String)

@Serializable
data class MovieFilter(
    val genres: List<Int> = emptyList(),
    val actors: List<Int> = emptyList(),
    val directors: List<Int> = emptyList(),
    val writers: List<Int> = emptyList(),

    val minYear: Int? = null,
    val maxYear: Int? = null,

    val minRating: Double? = null,
    val maxRating: Double? = null,

    val sortBy: MovieSort = MovieSort.RANDOM,
    val descending: Boolean = true,
    val showLiked: Boolean = false,
    val showDisliked: Boolean = false,
    val movieName: String = ""
)

@Serializable
enum class MovieSort {
    RANDOM,
    YEAR,
    IMDB_RATING,
    TITLE
}

interface MovieDatabase {
    fun getById(vararg id: Int): List<Movie>
    fun query(amount: Int, filter: MovieFilter?): List<Movie>
    fun insert(movie: Movie)
    fun delete(id: Int)
}
