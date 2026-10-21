package com.example.service

import com.example.Security.SessionToken
import com.example.dtos.QueryRequest
import com.example.dtos.QueryResponse
import com.example.dtos.SyncRequest
import com.example.sessions.SessionManager

object DataQuery {


    fun execute(query: QueryRequest, userID: Int? = null): QueryResponse {
        var token = query.sessionToken
        val existingSession = token?.let { SessionManager.getSessionId(it, userID) }

        if (token == null || (userID == null && existingSession == null)) token = SessionToken.generate()
        val currentSessionId = existingSession ?: SessionManager.createNewSession(token, userID)
        val movies = SessionManager.pollMovies(currentSessionId, filterSettings = query.filterSettings)
        val preferences = SessionManager.getPreferences(token)

        return QueryResponse(token, movies, preferences)
    }

    fun sync(request: SyncRequest, token: String, userID: Int) {
        SessionManager.sync(token, userID, request.preferences)
    }

}
