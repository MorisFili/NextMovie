import {localhost} from "../../data/Settings"

async function authenticate(action, username, password) {
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

        if (response.status === 401) {
            throw new Error("Incorrect username or password.")
        }
        if (response.status === 417) {
            throw new Error("That username is already registered. Try signing in.")
        }
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
        throw new Error(error.message)
    }
}

export const onLogin = (username, password) => authenticate("login", username, password)
export const onSignUp = (username, password) => authenticate("register", username, password)
