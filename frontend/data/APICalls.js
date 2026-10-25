import {localhost} from "./Settings"
import {ServerError, AuthenticationError} from "./Errors";


export async function fetchMovies(sessionToken) {
    const response = await fetch(localhost + "default", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sessionToken: sessionToken
        })
    })

    if (response.status >= 500) throw new ServerError("Unable to connect to server.")
    if (!response.ok) throw new Error("Couldn't load movies. Please try again.")

    return response.json()
}

export async function fetchMoviesAuthorized(sessionToken) {
    const response = await fetch(localhost + "query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + sessionToken,
        },
        body: JSON.stringify({
            sessionToken: sessionToken
        })
    })

    if (response.status === 401) throw new AuthenticationError("Session token expired.")
    if (response.status >= 500) throw new ServerError("Unable to connect to server.")
    if (!response.ok) throw new Error("Couldn't load movies. Please try again.")

    return response.json()
}

export async function fetchFiltered(sessionToken, filterSettings) {
    const response = await fetch(localhost + "query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + sessionToken,
        },
        body: JSON.stringify({
            sessionToken: sessionToken,
            filterSettings: filterSettings
        })
    })

    if (response.status === 401) throw new AuthenticationError("Session token expired.")
    if (response.status >= 500) throw new ServerError("Unable to connect to server.")
    if (!response.ok) throw new Error("Couldn't load movies. Please try again.")

    return response.json()
}

export async function requestPreferences(sessionToken, method = "GET", movieId, liked) {
    let url = localhost + "preferences"
    if (movieId != null) {
        url = url + "/" + movieId
    }

    const requestOptions = {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + sessionToken,
        }
    }

    if (method === "POST" || method === "PATCH") {
        requestOptions.body = JSON.stringify({
            liked: liked
        })
    }

    let response
    try {
        response = await fetch(url, requestOptions)
    } catch {
        throw new Error("Couldn't connect. Check your connection and try again.")
    }

    if (response.status === 401) throw new AuthenticationError("Session token expired.")
    if (response.status >= 500) throw new ServerError("Unable to connect to server.")
    if (!response.ok) {
        throw new Error("Couldn't save or load your movie choices. Please try again.")
    }
    if (method === "GET") {
        return response.json()
    }
}

export async function authenticate(action, username, password) {
    try {
        const response = await fetch(`${localhost}auth/${action}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                hashmail: username,
                hashword: password
            }),
        })

        if (response.status === 401) throw new AuthenticationError("Incorrect username or password.")
        if (response.status === 417) {
            throw new Error("That username is already registered. Try signing in.")
        }
        if (response.status >= 500) throw new ServerError("Unable to connect to server.")
        if (!response.ok) {
            throw new Error("Couldn't sign in or register. Please try again.")
        }
        const data = await response.json()
        if (!data.sessionToken) {
            throw new Error("Couldn't finish signing in. Please try again.")
        }
        return data
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error("Couldn't connect. Check your connection and try again.")
        }
        throw error
    }
}
