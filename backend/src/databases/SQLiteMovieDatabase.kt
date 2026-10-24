package com.example.databases

import com.example.interfaces.Movie
import com.example.interfaces.MovieDatabase
import com.example.interfaces.MovieFilter
import com.example.interfaces.MovieSort
import com.example.interfaces.Person
import com.example.interfaces.Genre
import com.example.interfaces.Language
import com.example.interfaces.Trailer
import java.sql.Connection
import java.sql.DriverManager
import java.sql.ResultSet

object SQLiteMovieDatabase : MovieDatabase, AutoCloseable {

    private val persistentConnection: Connection =
        DriverManager.getConnection("jdbc:sqlite:./backend/data/nextmovie_movie_demo.db")

    init {
        try {
            execute(persistentConnection, "PRAGMA foreign_keys = ON")
            execute(persistentConnection, "PRAGMA busy_timeout = 5000")
            execute(persistentConnection, "PRAGMA journal_mode = WAL")
            checkExistingSchema(persistentConnection)
            createTables(persistentConnection)
        } catch (error: Throwable) {
            persistentConnection.close()
            throw error
        }
    }

    private fun checkExistingSchema(connection: Connection) {
        val columns = ArrayList<String>()
        connection.createStatement().use { statement ->
            statement.executeQuery("PRAGMA table_info(movies)").use { result ->
                while (result.next()) {
                    columns.add(result.getString("name"))
                }
            }
        }

        if (columns.isEmpty()) {
            return
        }

        val requiredColumns = listOf(
            "nmid", "title", "year", "rated", "released", "runtime",
            "tmdb_poster_path", "plot", "imdbid"
        )
        if (!columns.containsAll(requiredColumns)) {
            throw IllegalStateException(
                "The movies table uses an older schema. Migrate the existing database before opening it."
            )
        }

        val trailerColumns = mutableSetOf<String>()
        connection.createStatement().use { statement ->
            statement.executeQuery("PRAGMA table_info(movie_trailers)").use { result ->
                while (result.next()) {
                    trailerColumns.add(result.getString("name"))
                }
            }
        }

        check(trailerColumns.isEmpty() ||
                trailerColumns.containsAll(listOf("movie_id", "key", "source", "language"))) {
            "The movie_trailers table uses an older schema. Migrate the existing database before opening it."
        }
    }

    private fun createTables(connection: Connection) {
        connection.autoCommit = false
        try {
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS movies (
                        nmid INTEGER PRIMARY KEY,
                        title TEXT NOT NULL,
                        year INTEGER,
                        rated TEXT,
                        released DATE,
                        runtime INTEGER,
                        tmdb_poster_path TEXT,
                        plot TEXT,
                        imdbid TEXT UNIQUE
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS people (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        imdbid TEXT UNIQUE
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS movie_people (
                        movie_id INTEGER REFERENCES movies(nmid),
                        person_id INTEGER REFERENCES people(id),
                        role TEXT,
                        PRIMARY KEY (movie_id, person_id, role)
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS genres (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS movie_genres (
                        movie_id INTEGER REFERENCES movies(nmid),
                        genre_id INTEGER REFERENCES genres(id),
                        PRIMARY KEY (movie_id, genre_id)
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS languages (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE
                    )
                """.trimIndent()
            )
            execute(
                connection, """
                    CREATE TABLE IF NOT EXISTS movie_languages (
                        movie_id INTEGER REFERENCES movies(nmid),
                        language_id INTEGER REFERENCES languages(id),
                        PRIMARY KEY (movie_id, language_id)
                    )
                """.trimIndent()
            )
            execute(connection, """
                CREATE TABLE IF NOT EXISTS movie_ratings (
                    movie_id INTEGER NOT NULL REFERENCES movies(nmid),
                    rating REAL NOT NULL CHECK (rating BETWEEN 0 AND 10),
                    source TEXT NOT NULL,
                    PRIMARY KEY (movie_id, source)
                )
            """.trimIndent())
            execute(connection, """
                CREATE TABLE IF NOT EXISTS movie_trailers (
                    movie_id INTEGER NOT NULL REFERENCES movies(nmid),
                    key TEXT NOT NULL,
                    source TEXT NOT NULL,
                    language TEXT,
                    PRIMARY KEY (movie_id, key, source)
                )
            """.trimIndent())
            connection.commit()
        } catch (error: Throwable) {
            connection.rollback()
            throw error
        } finally {
            connection.autoCommit = true
        }
    }


    override fun getById(vararg id: Int): List<Movie> {
        return getById(*id, connection = persistentConnection)
    }

    private fun getById(vararg id: Int, connection: Connection = persistentConnection): List<Movie> {
        synchronized(connection) {
            if (id.isEmpty()) {
                return emptyList()
            }

            val sql = StringBuilder("SELECT movies.*, rating.rating AS imdb_rating " +
                    "FROM movies LEFT JOIN movie_ratings AS rating ON rating.movie_id = movies.nmid " +
                    "AND rating.source = 'imdb' WHERE nmid IN (")
            for (index in id.indices) {
                if (index > 0) {
                    sql.append(", ")
                }
                sql.append("?")
            }
            sql.append(") ORDER BY nmid")

            connection.prepareStatement(sql.toString()).use { statement ->
                for (index in id.indices) {
                    statement.setInt(index + 1, id[index])
                }
                statement.executeQuery().use { result ->
                    return readMovies(connection, result)
                }
            }
        }
    }

    override fun query(amount: Int, filter: MovieFilter?): List<Movie> {

        return query(amount, filter ?: MovieFilter(), persistentConnection)
    }

    private fun query(amount: Int, filter: MovieFilter = MovieFilter(),
                       connection: Connection = persistentConnection): List<Movie> {

        if (amount <= 0) {
            return emptyList()
        }

        synchronized(connection) {
            val sql = StringBuilder("SELECT movie.*, rating.rating AS imdb_rating FROM movies AS movie " +
                    "LEFT JOIN movie_ratings AS rating ON rating.movie_id = movie.nmid " +
                    "AND rating.source = 'imdb' WHERE 1 = 1")
            val parameters = ArrayList<Any>()

            if (filter.movieName.isNotBlank()) {
                sql.append(" AND INSTR(LOWER(movie.title), LOWER(?)) > 0")
                parameters.add(filter.movieName.trim())
            }

            if (filter.genres.isNotEmpty()) {
                sql.append(" AND EXISTS (SELECT 1 FROM movie_genres WHERE movie_id = movie.nmid AND genre_id IN (")
                for (index in filter.genres.indices) {
                    if (index > 0) {
                        sql.append(", ")
                    }
                    sql.append("?")
                    parameters.add(filter.genres[index])
                }
                sql.append("))")
            }

            if (filter.actors.isNotEmpty()) {
                sql.append(" AND EXISTS (SELECT 1 FROM movie_people WHERE movie_id = movie.nmid")
                sql.append(" AND LOWER(role) IN ('actor', 'actress') AND person_id IN (")
                for (index in filter.actors.indices) {
                    if (index > 0) {
                        sql.append(", ")
                    }
                    sql.append("?")
                    parameters.add(filter.actors[index])
                }
                sql.append("))")
            }

            if (filter.directors.isNotEmpty()) {
                sql.append(" AND EXISTS (SELECT 1 FROM movie_people WHERE movie_id = movie.nmid")
                sql.append(" AND LOWER(role) = 'director' AND person_id IN (")
                for (index in filter.directors.indices) {
                    if (index > 0) {
                        sql.append(", ")
                    }
                    sql.append("?")
                    parameters.add(filter.directors[index])
                }
                sql.append("))")
            }

            if (filter.writers.isNotEmpty()) {
                sql.append(" AND EXISTS (SELECT 1 FROM movie_people WHERE movie_id = movie.nmid")
                sql.append(" AND LOWER(role) = 'writer' AND person_id IN (")
                for (index in filter.writers.indices) {
                    if (index > 0) {
                        sql.append(", ")
                    }
                    sql.append("?")
                    parameters.add(filter.writers[index])
                }
                sql.append("))")
            }

            if (filter.minYear != null) {
                sql.append(" AND movie.year >= ?")
                parameters.add(filter.minYear)
            }
            if (filter.maxYear != null) {
                sql.append(" AND movie.year <= ?")
                parameters.add(filter.maxYear)
            }

            // IMDb bounds are inclusive scores out of 100. Unrated movies do not match rating bounds.
            if (filter.minRating != null) {
                sql.append(" AND rating.rating * 10 >= ?")
                parameters.add(filter.minRating)
            }
            if (filter.maxRating != null) {
                sql.append(" AND rating.rating * 10 <= ?")
                parameters.add(filter.maxRating)
            }

            if (filter.sortBy == MovieSort.RANDOM) {
                sql.append(" ORDER BY RANDOM()")
            } else {
                when (filter.sortBy) {
                    MovieSort.YEAR -> sql.append(" ORDER BY movie.year IS NULL, movie.year")
                    MovieSort.IMDB_RATING -> sql.append(" ORDER BY rating.rating IS NULL, rating.rating")
                    MovieSort.TITLE -> sql.append(" ORDER BY movie.title COLLATE NOCASE")
                    MovieSort.RANDOM -> throw IllegalStateException("Random ordering was already handled")
                }
                if (filter.descending) {
                    sql.append(" DESC")
                } else {
                    sql.append(" ASC")
                }
                sql.append(", movie.nmid ASC")
            }

            sql.append(" LIMIT ?")
            parameters.add(amount)

            connection.prepareStatement(sql.toString()).use { statement ->
                for (index in parameters.indices) {
                    statement.setObject(index + 1, parameters[index])
                }
                statement.executeQuery().use { result ->
                    return readMovies(connection, result)
                }
            }
        }
    }

    private fun readMovies(connection: Connection, result: ResultSet): List<Movie> {
        val movies = ArrayList<Movie>()
        while (result.next()) {
            val movieId = result.getInt("nmid")
            var year: Int? = result.getInt("year")
            if (result.wasNull()) {
                year = null
            }
            var runtime: Int? = result.getInt("runtime")
            if (result.wasNull()) {
                runtime = null
            }

            val people = ArrayList<Person>()
            val peopleSql = """
                SELECT people.id, people.name, people.imdbid, movie_people.role
                FROM people JOIN movie_people ON people.id = movie_people.person_id
                WHERE movie_people.movie_id = ?
                ORDER BY people.id, movie_people.role
            """.trimIndent()
            connection.prepareStatement(peopleSql).use { statement ->
                statement.setInt(1, movieId)
                statement.executeQuery().use { personResult ->
                    while (personResult.next()) {
                        val person = Person(
                            id = personResult.getInt("id"),
                            name = personResult.getString("name"),
                            imdbid = personResult.getString("imdbid"),
                            role = personResult.getString("role")
                        )
                        people.add(person)
                    }
                }
            }

            val genres = ArrayList<Genre>()
            val genresSql = """
                SELECT genres.id, genres.name
                FROM genres JOIN movie_genres ON genres.id = movie_genres.genre_id
                WHERE movie_genres.movie_id = ? ORDER BY genres.id
            """.trimIndent()
            connection.prepareStatement(genresSql).use { statement ->
                statement.setInt(1, movieId)
                statement.executeQuery().use { genreResult ->
                    while (genreResult.next()) {
                        val genre = Genre(genreResult.getInt("id"), genreResult.getString("name"))
                        genres.add(genre)
                    }
                }
            }

            val languages = ArrayList<Language>()
            val languagesSql = """
                SELECT languages.id, languages.name
                FROM languages JOIN movie_languages ON languages.id = movie_languages.language_id
                WHERE movie_languages.movie_id = ? ORDER BY languages.id
            """.trimIndent()
            connection.prepareStatement(languagesSql).use { statement ->
                statement.setInt(1, movieId)
                statement.executeQuery().use { languageResult ->
                    while (languageResult.next()) {
                        val language = Language(languageResult.getInt("id"), languageResult.getString("name"))
                        languages.add(language)
                    }
                }
            }

            val imdbRating = result.getDouble("imdb_rating").let { if (result.wasNull()) null else it }

            val trailers = connection.prepareStatement("SELECT key, source, language FROM movie_trailers WHERE movie_id = ? ORDER BY rowid").use { statement ->
                statement.setInt(1, movieId)
                statement.executeQuery().use { rows ->
                    buildList {
                        while (rows.next()) add(Trailer(rows.getString("key"), rows.getString("source"), rows.getString("language")))
                    }
                }
            }
            val movie = Movie(
                nmid = movieId,
                title = result.getString("title"),
                year = year,
                rated = result.getString("rated"),
                released = result.getString("released"),
                runtime = runtime,
                tmdbPosterPath = result.getString("tmdb_poster_path"),
                trailers = trailers,
                plot = result.getString("plot"),
                imdbid = result.getString("imdbid"),
                people = people,
                genres = genres,
                languages = languages,
                imdbRating = imdbRating
            )
            movies.add(movie)
        }
        return movies
    }

    override fun insert(movie: Movie) {
        insert(movie, persistentConnection)
    }

    private fun insert(movie: Movie, connection: Connection = persistentConnection) {
        synchronized(connection) {
            connection.autoCommit = false
            try {
                val sql = """
                    INSERT INTO movies (nmid, title, year, rated, released, runtime, tmdb_poster_path, plot, imdbid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """.trimIndent()
                connection.prepareStatement(sql).use { statement ->
                    statement.setInt(1, movie.nmid)
                    statement.setString(2, movie.title)
                    statement.setObject(3, movie.year)
                    statement.setString(4, movie.rated)
                    statement.setString(5, movie.released)
                    statement.setObject(6, movie.runtime)
                    statement.setString(7, movie.tmdbPosterPath)
                    statement.setString(8, movie.plot)
                    statement.setString(9, movie.imdbid)
                    statement.executeUpdate()
                }

                insertPeople(connection, movie)
                insertGenres(connection, movie)
                insertLanguages(connection, movie)
                insertMovieMedia(connection, movie.nmid, movie.imdbRating, movie.trailers)
                connection.commit()
            } catch (error: Throwable) {
                connection.rollback()
                throw error
            } finally {
                connection.autoCommit = true
            }
        }
    }

    override fun delete(id: Int) {
        delete(id, persistentConnection)
    }

    private fun delete(id: Int, connection: Connection = persistentConnection) {
        synchronized(connection) {
            connection.autoCommit = false
            try {
                val queries = listOf(
                    "DELETE FROM movie_people WHERE movie_id = ?",
                    "DELETE FROM movie_genres WHERE movie_id = ?",
                    "DELETE FROM movie_languages WHERE movie_id = ?",
                    "DELETE FROM movie_ratings WHERE movie_id = ?",
                    "DELETE FROM movie_trailers WHERE movie_id = ?",
                    "DELETE FROM movies WHERE nmid = ?"
                )
                for (sql in queries) {
                    connection.prepareStatement(sql).use { statement ->
                        statement.setInt(1, id)
                        statement.executeUpdate()
                    }
                }
                connection.commit()
            } catch (error: Throwable) {
                connection.rollback()
                throw error
            } finally {
                connection.autoCommit = true
            }
        }
    }


    private fun insertPeople(connection: Connection, movie: Movie) {
        val personSql = """
            INSERT INTO people (id, name, imdbid) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, imdbid = excluded.imdbid
        """.trimIndent()
        val linkSql = "INSERT INTO movie_people (movie_id, person_id, role) VALUES (?, ?, ?)"
        for (person in movie.people) {
            connection.prepareStatement(personSql).use { statement ->
                statement.setInt(1, person.id)
                statement.setString(2, person.name)
                statement.setString(3, person.imdbid)
                statement.executeUpdate()
            }
            connection.prepareStatement(linkSql).use { statement ->
                statement.setInt(1, movie.nmid)
                statement.setInt(2, person.id)
                statement.setString(3, person.role)
                statement.executeUpdate()
            }
        }
    }

    private fun insertGenres(connection: Connection, movie: Movie) {
        val genreSql = """
            INSERT INTO genres (id, name) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name
        """.trimIndent()
        val linkSql = "INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)"
        for (genre in movie.genres) {
            connection.prepareStatement(genreSql).use { statement ->
                statement.setInt(1, genre.id)
                statement.setString(2, genre.name)
                statement.executeUpdate()
            }
            connection.prepareStatement(linkSql).use { statement ->
                statement.setInt(1, movie.nmid)
                statement.setInt(2, genre.id)
                statement.executeUpdate()
            }
        }
    }

    private fun insertLanguages(connection: Connection, movie: Movie) {
        val languageSql = """
            INSERT INTO languages (id, name) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name
        """.trimIndent()
        val linkSql = "INSERT INTO movie_languages (movie_id, language_id) VALUES (?, ?)"
        for (language in movie.languages) {
            connection.prepareStatement(languageSql).use { statement ->
                statement.setInt(1, language.id)
                statement.setString(2, language.name)
                statement.executeUpdate()
            }
            connection.prepareStatement(linkSql).use { statement ->
                statement.setInt(1, movie.nmid)
                statement.setInt(2, language.id)
                statement.executeUpdate()
            }
        }
    }

    private fun insertMovieMedia(connection: Connection, movieId: Int, imdbRating: Double?, trailers: List<Trailer>) {
        if (imdbRating != null) {
            connection.prepareStatement("INSERT INTO movie_ratings (movie_id, rating, source) VALUES (?, ?, 'imdb')").use { statement ->
                statement.setInt(1, movieId)
                statement.setDouble(2, imdbRating)
                statement.executeUpdate()
            }
        }
        trailers.forEach { trailer ->
            connection.prepareStatement("INSERT INTO movie_trailers (movie_id, key, source, language) VALUES (?, ?, ?, ?)").use { statement ->
                statement.setInt(1, movieId)
                statement.setString(2, trailer.key)
                statement.setString(3, trailer.source)
                statement.setString(4, trailer.language)
                statement.executeUpdate()
            }
        }
    }

    private fun execute(connection: Connection, sql: String) {
        connection.createStatement().use { statement ->
            statement.execute(sql)
        }
    }

    override fun close() {
        synchronized(persistentConnection) {
            persistentConnection.close()
        }
    }
}
