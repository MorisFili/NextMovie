import {localhost} from "./Settings"


export async function fetchMovies(sessionToken, authorized = false) {
        const response  = await fetch(localhost + (authorized ? "query" : "default"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + sessionToken,
            },
            body: JSON.stringify({
                sessionToken: sessionToken
            })
        })

        if (authorized && response.status === 401) {
            return fetchMovies(sessionToken, false)
             // token expired, retry as guest
        }
        if (!response.ok) throw new Error("Couldn't load movies. Please try again.")

        return response.json()
}

export async function fetchFiltered(sessionToken, filterSettings) {
    const response  = await fetch(localhost + "query", {
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

    if (response.status === 401) {
        return fetchMovies(sessionToken, false)
         // token expired, retry as guest
    }
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

    if (response.status === 401) {
        throw new Error("Your session expired. Please sign in again.")
    }
    if (!response.ok) {
        throw new Error("Couldn't save or load your movie choices. Please try again.")
    }
    if (method === "GET") {
        return response.json()
    }
}
