package com.example.databases

import com.example.interfaces.User
import com.example.interfaces.UserDatabase
import com.example.Security.Hasher
import com.example.dtos.Preferences
import java.sql.Connection
import java.sql.DriverManager

object SQLiteUserDatabase : UserDatabase {

    private var persistentConnection: Connection = DriverManager.getConnection("jdbc:sqlite:./backend/data/nextmovie_user.db")

    init {
        try {
            checkExistingSchema(persistentConnection)
            persistentConnection.createStatement().use {
                it.execute("PRAGMA foreign_keys = ON")
                it.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY,
                        email TEXT NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL
                    )
                """.trimIndent())
                it.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS movie_preferences (
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        movie_id INTEGER NOT NULL,
                        liked INTEGER NOT NULL CHECK (liked IN (0, 1)),
                        PRIMARY KEY (user_id, movie_id)
                    )
                """.trimIndent())
            }
        } catch (error: Throwable) {
            persistentConnection.close()
            throw error
        }
    }

    private fun checkExistingSchema(connection: Connection) {
        val columns = ArrayList<String>()
        connection.createStatement().use { statement ->
            statement.executeQuery("PRAGMA table_info(users)").use { result ->
                while (result.next()) {
                    columns.add(result.getString("name"))
                }
            }
        }

        if (columns.isEmpty()) {
            return
        }

        val requiredColumns = listOf("id", "email", "password_hash")
        if (!columns.containsAll(requiredColumns)) {
            throw IllegalStateException(
                "The users table has a malformed schema. Migrate the existing database before opening it."
            )
        }
    }

    @Synchronized
    override fun authenticate(email: String, hashWord: String): User? {
        persistentConnection.prepareStatement(
            "SELECT * FROM users WHERE email = ?"
        ).use { statement ->
            statement.setString(1, email)

            statement.executeQuery().use { result ->
                if (!result.next()) return null
                if (!Hasher.verifyPassword(hashWord, result.getString("password_hash"))) return null

                return User(
                    result.getInt("id"),
                    result.getString("email"),
                    result.getString("password_hash")
                )
            }
        }
    }

    @Synchronized
    override fun createUser(email: String, hashWord: String): User? {
        return insert(email, hashWord)
    }

    private fun insert(email: String, hashWord: String): User? {
        persistentConnection.prepareStatement(
            "INSERT INTO users (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO NOTHING RETURNING id"
        ).use { statement ->
            statement.setString(1, email)
            statement.setString(2, hashWord)
            statement.executeQuery().use { result ->
                return if (result.next()) User(result.getInt("id"), email, hashWord) else null
            }
        }
    }

    @Synchronized
    override fun delete(id: Int) {
        persistentConnection.prepareStatement(
            "DELETE FROM users WHERE id = ?"
        ).use { statement ->
            statement.setInt(1, id)
            statement.executeUpdate()
        }
    }

    @Synchronized
    fun getPreferences(userID: Int): Preferences {
        persistentConnection.prepareStatement(
            "SELECT movie_id, liked FROM movie_preferences WHERE user_id = ?"
        ).use { statement ->
            statement.setInt(1, userID)

            statement.executeQuery().use { result ->
                val likedMovies = mutableMapOf<Int, Boolean?>()
                while (result.next()) {
                    val movieID = result.getInt("movie_id")
                    val liked = result.getBoolean("liked")
                    likedMovies[movieID] = liked
                }
                return Preferences(likedMovies = likedMovies)
            }
        }
    }

    @Synchronized
    fun savePreference(userID: Int, movieID: Int, liked: Boolean?, create: Boolean = false): Boolean {
        val sql: String
        if (liked == null) {
            sql = "DELETE FROM movie_preferences WHERE user_id = ? AND movie_id = ?"
        } else if (create) {
            sql = "INSERT INTO movie_preferences (user_id, movie_id, liked) VALUES (?, ?, ?) ON CONFLICT DO NOTHING"
        } else {
            sql = "UPDATE movie_preferences SET liked = ? WHERE user_id = ? AND movie_id = ?"
        }

        persistentConnection.prepareStatement(sql).use { statement ->
            if (liked == null) {
                statement.setInt(1, userID)
                statement.setInt(2, movieID)
            } else if (create) {
                statement.setInt(1, userID)
                statement.setInt(2, movieID)
                statement.setBoolean(3, liked)
            } else {
                statement.setBoolean(1, liked)
                statement.setInt(2, userID)
                statement.setInt(3, movieID)
            }
            return statement.executeUpdate() > 0
        }
    }

    fun close() {
        persistentConnection.close()
    }
}
