package com.example.databases

import java.sql.Connection
import java.sql.DriverManager

object SQLiteSessionDatabase : AutoCloseable {

    private val persistentConnection: Connection =
        DriverManager.getConnection("jdbc:sqlite:./backend/data/nextmovie_session.db")

    init {
        try {
            persistentConnection.createStatement().use { statement ->
                // Users live in a separate database; SQLite cannot enforce this cross-file reference.
                // OFF also permits writes to existing tokens tables containing that legacy constraint.
                statement.execute("PRAGMA foreign_keys = OFF")
                statement.execute("PRAGMA busy_timeout = 5000")
                statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS tokens (
                        token TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at INTEGER NOT NULL,
                        expires_at INTEGER NOT NULL,

                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """.trimIndent())
            }
        } catch (error: Throwable) {
            persistentConnection.close()
            throw error
        }
    }

    /** Returns the user ID for an unexpired token. Timestamps use Unix milliseconds. */
    fun getUserIdByToken(token: String?): Int? {
        if (token == null) return null
        synchronized(persistentConnection) {
            persistentConnection.prepareStatement(
                "SELECT user_id FROM tokens WHERE token = ? AND expires_at > ?"
            ).use { statement ->
                statement.setString(1, token)
                statement.setLong(2, System.currentTimeMillis())

                statement.executeQuery().use { result ->
                    if (!result.next()) return null

                    return result.getInt("user_id")
                }
            }
        }
    }

    /** Stores the supplied token value; createdAt and expiresAt use Unix milliseconds. */
    fun insert(token: String, userId: Int, createdAt: Long, expiresAt: Long) {
        synchronized(persistentConnection) {
            persistentConnection.prepareStatement(
                "INSERT INTO tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
            ).use { statement ->
                statement.setString(1, token)
                statement.setInt(2, userId)
                statement.setLong(3, createdAt)
                statement.setLong(4, expiresAt)
                statement.executeUpdate()
            }
        }
    }

    fun delete(token: String) {
        synchronized(persistentConnection) {
            persistentConnection.prepareStatement(
                "DELETE FROM tokens WHERE token = ?"
            ).use { statement ->
                statement.setString(1, token)
                statement.executeUpdate()
            }
        }
    }

    override fun close() {
        synchronized(persistentConnection) {
            persistentConnection.close()
        }
    }
}
