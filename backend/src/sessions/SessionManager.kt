package com.example.sessions

import com.example.data.MovieCache
import com.example.databases.SQLiteMovieDatabase
import com.example.databases.SQLiteUserDatabase
import com.example.interfaces.Movie
import com.example.interfaces.MovieFilter
import com.example.dtos.Preferences
import java.security.SecureRandom
import java.util.*
import java.util.concurrent.ConcurrentHashMap

object SessionManager {

    private const val TIMEOUT = 30 * 60 * 1000L // 30 minutes

    private val random = SecureRandom()
    private val sessions = ConcurrentHashMap<String, UserSession>()
    private val sessionMovieCache = ConcurrentHashMap<String, MovieCache>()


    fun createNewSession(token: String? = null, userID: Int? = null): String {
        val bytes = ByteArray(32)
        random.nextBytes(bytes)

        val id = Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(bytes)

        val session = UserSession(id)
        session.lastActivity = System.currentTimeMillis()
        session.token = token
        session.userID = userID
        if (userID != null) {
            session.preferences = SQLiteUserDatabase.getPreferences(userID)
        }

        sessionMovieCache[id] = MovieCache(SQLiteMovieDatabase.query(100, null))

        sessions[id] = session

        return id
    }

    fun pollMovies(sessionID: String, amount: Int = 30, filterSettings: MovieFilter? = null) : List<Movie> {
        val session = sessions[sessionID]!!
        if (filterSettings != null && filterSettings != session.movieFilter) {
            session.movieFilter = filterSettings
            sessionMovieCache[sessionID] = MovieCache(SQLiteMovieDatabase.query(100, filterSettings))
        }
        val filter = session.movieFilter
        if (filter?.showLiked == true || filter?.showDisliked == true) {
            val ids = session.preferences.likedMovies.filterValues { liked ->
                (filter.showLiked && liked == true) || (filter.showDisliked && liked == false)
            }.keys
            return SQLiteMovieDatabase.getById(*ids.toIntArray())
                .filter { it.title.contains(filter.movieName.trim(), ignoreCase = true) }
        }

        val sessionCache = sessionMovieCache[sessionID]!!
        val sessionFilter = sessions[sessionID]?.movieFilter

        val movieBatch = sessionCache.pollBatch(amount)
        if (sessionCache.needsRefill()) {
            sessionCache.addAll(SQLiteMovieDatabase.query(sessionCache.topUpAmt(), sessionFilter))
        }
        return movieBatch
    }

    fun getSessionId(token: String, userID: Int? = null): String? {
        cleanup()

        val session = sessions.values.find { it.token == token && it.userID == userID }

        if (session == null) return null

        val now = System.currentTimeMillis()

        session.lastActivity = now
        return session.id
    }

    private fun cleanup() {
        val now = System.currentTimeMillis()

        sessions.values.filter { now - it.lastActivity >= TIMEOUT }.forEach { remove(it.id) }
    }

    private fun remove(id: String) {
        sessions.remove(id)
        sessionMovieCache.remove(id)
    }

    fun sync(token: String, userID: Int, preferences: Preferences) {
        val sessionID = getSessionId(token, userID) ?: createNewSession(token, userID)
        sessions[sessionID]!!.preferences = preferences
    }

    fun removeByToken(token: String) {
        sessions.values.filter { it.token == token }.forEach { remove(it.id) }
    }

    fun updatePreferences(userID: Int, preferences: Preferences) {
        for (session in sessions.values) {
            if (session.userID == userID) {
                session.preferences = preferences
            }
        }
    }

    fun getPreferences(token: String): Preferences? {
        return sessions.values.find { it.token == token }?.preferences
    }
}
