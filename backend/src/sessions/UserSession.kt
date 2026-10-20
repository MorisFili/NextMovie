package com.example.sessions

import com.example.interfaces.MovieFilter
import com.example.dtos.Preferences

class UserSession (
    val id: String,
    @Volatile var userID: Int? = null,
    @Volatile var token: String? = null,
    @Volatile var lastActivity: Long = System.currentTimeMillis(),
    @Volatile var movieFilter: MovieFilter? = null,
    @Volatile var preferences: Preferences = Preferences()
)
