package com.example.service

import com.example.Security.Hasher
import com.example.Security.SessionToken
import com.example.databases.SQLiteSessionDatabase
import com.example.databases.SQLiteUserDatabase
import com.example.dtos.LoginRequest
import com.example.dtos.LoginResponse
import com.example.sessions.SessionManager
import kotlin.time.Clock.System.now

object AuthenticationService {

    fun login(request: LoginRequest): LoginResponse? {

        val hashmail = Hasher.hashEmail(request.hashmail)
        val authenticatedUser = SQLiteUserDatabase.authenticate(hashmail, request.hashword) ?: return null

        val token = SessionToken.generate()

        val sessionID = generateSession(authenticatedUser.id, token)

        val preferences = SessionManager.getPreferences(token)

        return LoginResponse(token, SessionManager.pollMovies(sessionID), preferences)
    }

    fun register(request: LoginRequest): LoginResponse? {
        val hashmail = Hasher.hashEmail(request.hashmail)
        val hashword = Hasher.hashPassword(request.hashword)

        val newUser = SQLiteUserDatabase.createUser(hashmail, hashword) ?: return null

        val token = SessionToken.generate()

        val sessionID = generateSession(newUser.id, token)

        return LoginResponse(token, SessionManager.pollMovies(sessionID), preferences = null)
    }

    private fun generateSession(userID: Int, token: String) : String {
        val createdAt = now().toEpochMilliseconds()
        SQLiteSessionDatabase.insert(
            token = SessionToken.hash(token),
            userId = userID,
            createdAt = createdAt,
            expiresAt = createdAt + 30L * 24 * 60 * 60 * 1000
        )
        return SessionManager.createNewSession(token, userID)
    }
}
