package com.example


import com.example.databases.SQLiteMovieDatabase
import com.example.databases.SQLiteSessionDatabase
import com.example.databases.SQLiteUserDatabase
import com.example.Security.SessionToken
import com.example.dtos.LoginRequest
import com.example.dtos.QueryRequest
import com.example.dtos.SyncRequest
import com.example.dtos.MoviePreference
import com.example.service.AuthenticationService
import com.example.service.DataQuery
import com.example.sessions.SessionManager
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.request.*
import io.ktor.server.response.respond
import io.ktor.server.routing.*
import java.nio.file.Files
import java.nio.file.Path

private data class AuthenticatedUser(val userID: Int, val token: String)

fun main() {
    Files.createDirectories(Path.of("./backend/data"))

    try {
        val server = embeddedServer(Netty, host = "0.0.0.0", port = System.getenv("PORT")?.toIntOrNull() ?: 8080) {

            // App context

            install(ContentNegotiation) {
                json()
            }

            install(Authentication) {

                bearer("session") {
                    authenticate { credentials ->
                        val userId = SQLiteSessionDatabase.getUserIdByToken(
                            SessionToken.hash(credentials.token)
                        )

                        userId?.let { AuthenticatedUser(it, credentials.token) }

                    }
                }
            }


            routing {

                post("/default") {
                    val request = call.receive<QueryRequest>()
                    val response = DataQuery.execute(request)
                    call.respond(HttpStatusCode.OK, response)
                }


                post("/auth/login") {
                    val request = call.receive<LoginRequest>()
                    val response = AuthenticationService.login(request)
                    if (response != null) call.respond(HttpStatusCode.Accepted, response)
                    else call.respond(HttpStatusCode.Unauthorized)

                }

                post("/auth/register") {
                    val request = call.receive<LoginRequest>()
                    val response = AuthenticationService.register(request)
                    if (response != null) call.respond(HttpStatusCode.Accepted, response)
                    else call.respond(HttpStatusCode.ExpectationFailed)
                }


                // Protected endpoints
                authenticate("session") {

                    get("/preferences") {
                        val user = call.principal<AuthenticatedUser>()!!
                        val preferences = SQLiteUserDatabase.getPreferences(user.userID)
                        call.respond(preferences)
                    }

                    route("/preferences/{movieId}") {
                        post {
                            val user = call.principal<AuthenticatedUser>()!!
                            val movieID = call.parameters["movieId"]?.toIntOrNull()
                            if (movieID == null || movieID <= 0) {
                                call.respond(HttpStatusCode.BadRequest)
                                return@post
                            }
                            if (SQLiteMovieDatabase.getById(movieID).isEmpty()) {
                                call.respond(HttpStatusCode.NotFound)
                                return@post
                            }

                            val request = call.receive<MoviePreference>()
                            val created = SQLiteUserDatabase.savePreference(
                                userID = user.userID,
                                movieID = movieID,
                                liked = request.liked,
                                create = true
                            )
                            if (!created) {
                                call.respond(HttpStatusCode.Conflict)
                                return@post
                            }

                            val preferences = SQLiteUserDatabase.getPreferences(user.userID)
                            SessionManager.updatePreferences(user.userID, preferences)
                            call.respond(HttpStatusCode.Created)
                        }

                        patch {
                            val user = call.principal<AuthenticatedUser>()!!
                            val movieID = call.parameters["movieId"]?.toIntOrNull()
                            if (movieID == null || movieID <= 0) {
                                call.respond(HttpStatusCode.BadRequest)
                                return@patch
                            }
                            if (SQLiteMovieDatabase.getById(movieID).isEmpty()) {
                                call.respond(HttpStatusCode.NotFound)
                                return@patch
                            }

                            val request = call.receive<MoviePreference>()
                            val updated = SQLiteUserDatabase.savePreference(
                                userID = user.userID,
                                movieID = movieID,
                                liked = request.liked
                            )
                            if (!updated) {
                                call.respond(HttpStatusCode.NotFound)
                                return@patch
                            }

                            val preferences = SQLiteUserDatabase.getPreferences(user.userID)
                            SessionManager.updatePreferences(user.userID, preferences)
                            call.respond(HttpStatusCode.NoContent)
                        }

                        delete {
                            val user = call.principal<AuthenticatedUser>()!!
                            val movieID = call.parameters["movieId"]?.toIntOrNull()
                            if (movieID == null || movieID <= 0) {
                                call.respond(HttpStatusCode.BadRequest)
                                return@delete
                            }

                            SQLiteUserDatabase.savePreference(
                                userID = user.userID,
                                movieID = movieID,
                                liked = null
                            )
                            val preferences = SQLiteUserDatabase.getPreferences(user.userID)
                            SessionManager.updatePreferences(user.userID, preferences)
                            call.respond(HttpStatusCode.NoContent)
                        }
                    }

                    post("/query") {
                        val user = call.principal<AuthenticatedUser>()!!
                        val request = call.receive<QueryRequest>()
                        val response = DataQuery.execute(request.copy(sessionToken = user.token), user.userID)
                        call.respond(HttpStatusCode.OK, response)
                    }

                    post("/sync") {
                        val user = call.principal<AuthenticatedUser>()!!
                        val request = call.receive<SyncRequest>()
                        DataQuery.sync(request, user.token, user.userID)
                        call.respond(HttpStatusCode.NoContent)
                    }

                    post("/auth/logout") {
                        val token = call.principal<AuthenticatedUser>()!!.token
                        SQLiteSessionDatabase.delete(SessionToken.hash(token))
                        SessionManager.removeByToken(token)
                        call.respond(HttpStatusCode.NoContent)
                    }
                }
            }
        }


        server.start(wait = true) // blocking
    } finally {
        SQLiteMovieDatabase.close()
        //users.close()
    }
}
