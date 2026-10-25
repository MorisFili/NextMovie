import {Alert} from "react-native"
import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react"
import * as SecureStore from "expo-secure-store"
import {DEFAULT_FILTER, localhost} from './Settings'
import {loadMovies} from "./DataLoader"
import {fetchMoviesAuthorized, fetchFiltered, requestPreferences, fetchMovies} from "./APICalls"
import {showToast} from "../components/Toast"
import {AuthenticationError} from "./Errors";

const Context = createContext(null)

export function DataProvider({children}) {

    const [sessionToken, setSessionToken] = useState(null)
    const [loggedIn, setLoggedIn] = useState(false)
    const [movieList, setMovieList] = useState([])
    const [loading, setLoading] = useState(true)
    const fetchingMovies = useRef(false)
    const filterVersion = useRef(0)
    const savingPreference = useRef(false)
    const currentToken = useRef(null)
    const [likedMovies, setLikedMovies] = useState({})
    const [loadingMore, setLoadingMore] = useState(false)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState(DEFAULT_FILTER)

    /* INIT */
    useEffect(() => {
        const start = async () => {
            setLoading(true)
            try {
                const token = await SecureStore.getItemAsync("sessionToken")
                setSessionToken(token)
                currentToken.current = token
                await startupSync(token)
            } catch {
                showToast("Unable to connect to server, trying again..", true)
            } finally {
                setLoading(false)
            }
        }
        start()
    }, [])

    async function startupSync(sessionToken) {
        let data
        while (!data) {
            if (sessionToken) {
                try {
                    data = await fetchMoviesAuthorized(sessionToken)
                    showToast("Session restored.")
                    setLoggedIn(true)
                    break
                } catch (e) {
                    if (e instanceof AuthenticationError) {
                        await clearSession()
                        sessionToken = null
                    } else {
                        showToast("Unable to connect, retrying..")
                        await new Promise(resolve => setTimeout(resolve, 2000))
                        continue
                    }
                }
            }

            try {
                data = await fetchMovies(sessionToken)
            } catch (e) {
                showToast("Unable to connect, retrying..")
                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        }
        setSessionToken(data.sessionToken)
        currentToken.current = data.sessionToken
        setMovieList(loadMovies(data))
        if (data.preferences.likedMovies) setLikedMovies(data.preferences.likedMovies)
    }

    /* ----------------- */

    useEffect(() => {
        const timeout = setTimeout(() => {
            setFilter(previous => {
                if (previous.movieName === search.trim()) {
                    return previous
                }
                return {...previous, movieName: search.trim()}
            })
        }, 500)
        return () => clearTimeout(timeout)
    }, [search])


    useEffect(() => {
        if (!loggedIn) return
        setLoading(true)

        filterVersion.current++
        const requestVersion = filterVersion.current

        async function fetch() {
            try {
                let data
                data = await fetchFiltered(sessionToken, filter)

                if (currentToken.current !== sessionToken || requestVersion !== filterVersion.current) return

                if (!data) {
                    showToast("Your session expired. Sign in to use your saved movies.")
                    setSessionToken(null)
                    currentToken.current = null
                    setLoggedIn(false)
                    setLikedMovies({})
                    setFilter(DEFAULT_FILTER)
                    data = await fetchMovies()
                    await SecureStore.setItemAsync("sessionToken", data.sessionToken)
                }

                setMovieList(loadMovies(data))
                setSessionToken(data.sessionToken)
                currentToken.current = data.sessionToken
                setLikedMovies(data.preferences.likedMovies)

            } catch (e) {
                if (currentToken.current !== sessionToken) return
                if (e instanceof AuthenticationError) return clearSession()
                if (requestVersion === filterVersion.current) {
                    showToast("Couldn't load movies. Check your connection and try again.", true)
                }
            } finally {
                if (requestVersion === filterVersion.current) {
                    setLoading(false)
                }
            }

        }

        fetch()
    }, [filter])

    async function reqMovies(sessionToken) {
        const requestVersion = filterVersion.current
        try {
            let data
            if (loggedIn && sessionToken) data = await fetchMoviesAuthorized(sessionToken)

            if (currentToken.current !== sessionToken || requestVersion !== filterVersion.current) return

            if (!data) {
                if (loggedIn) setLoggedIn(false)
                if (filter !== DEFAULT_FILTER) setFilter(DEFAULT_FILTER)
                data = await fetchMovies(sessionToken)
            }

            if (currentToken.current !== sessionToken || requestVersion !== filterVersion.current) return

            setLikedMovies(data.preferences.likedMovies)

            let movies = [...movieList, ...loadMovies(data)]

            if (data.sessionToken && data.sessionToken !== sessionToken) {
                // Different session fetched
                await SecureStore.setItemAsync("sessionToken", data.sessionToken)
                currentToken.current = data.sessionToken
                setSessionToken(data.sessionToken)
                setLikedMovies({})
                movies = loadMovies(data)
            }

            setMovieList([...new Map(movies.map(movie => [movie.nmid, movie])).values()]) // deduplication quickfix

        } catch (e) {
            if (currentToken.current !== sessionToken) return
            if (e instanceof AuthenticationError) return clearSession()
            if (requestVersion === filterVersion.current) {
                showToast("Couldn't load movies. Check your connection and try again.", true)
            }
        }
    }

    async function fetchMore() {
        if (loading) return
        if (loggedIn && (filter.showLiked || filter.showDisliked)) return
        if (fetchingMovies.current) return
        fetchingMovies.current = true
        setLoadingMore(true)

        try {
            await reqMovies(sessionToken)
        } finally {
            fetchingMovies.current = false
            setLoadingMore(false)
        }
    }

    const setPreference = useCallback(async (movie, liked) => {
        if (!loggedIn) {
            Alert.alert("Sign in", "Sign in to save your movie choices.")
            return
        }

        const previousPreference = likedMovies[movie.nmid]
        if (savingPreference.current || previousPreference === liked) {
            return
        }
        if (previousPreference == null && liked == null) {
            return
        }

        const method = liked == null ? "DELETE" : previousPreference == null ? "POST" : "PATCH";

        savingPreference.current = true
        try {
            await requestPreferences(sessionToken, method, movie.nmid, liked)
            if (currentToken.current !== sessionToken) {
                return
            }

            setLikedMovies(previousMovies => {
                const updatedMovies = {...previousMovies}
                if (liked == null) {
                    delete updatedMovies[movie.nmid]
                } else {
                    updatedMovies[movie.nmid] = liked
                }
                return updatedMovies
            })

            if (liked == null) {
                showToast("Movie choice removed.")
            } else if (liked) {
                showToast("Added to liked movies.")
            } else {
                showToast("Added to disliked movies.")
            }
        } catch (error) {
            if (currentToken.current !== sessionToken) return
            if (currentToken.current === sessionToken) Alert.alert("Couldn't save movie choice", error.message)
            if (error instanceof AuthenticationError) {
                showToast("Session expired, please log in again")
                await clearSession()
            }
        } finally {
            savingPreference.current = false
        }
    }, [loggedIn, likedMovies, sessionToken])

    async function completeLogin(data) {
        const preferences = await requestPreferences(data.sessionToken, "GET")
        await SecureStore.setItemAsync("sessionToken", data.sessionToken)
        setSessionToken(data.sessionToken)
        currentToken.current = data.sessionToken
        setMovieList(loadMovies(data))
        setLikedMovies(preferences?.likedMovies ?? {})
        setLoggedIn(true)
        showToast("Signed in. Your movie choices are restored.")
    }

    async function logout() {
        try {
            const response = await fetch(localhost + "auth/logout", {
                method: "POST",
                headers: {"Authorization": "Bearer " + sessionToken},
            })
            if (!response.ok && response.status !== 401) console.log("Couldn't sign out. Deleting locally")
        } catch (e) {
            console.log("Couldn't sign out. Deleting locally")
        } finally {
            await clearSession()
            showToast("Signed out.")
        }
    }

    async function clearSession() {
        await SecureStore.deleteItemAsync("sessionToken").catch(console.error)
        setSessionToken(null)
        currentToken.current = null
        setLoggedIn(false)
        setLikedMovies({})
        setFilter(DEFAULT_FILTER)
        setMovieList([])
        await reqMovies(null)
    }

    return (
        <Context.Provider value={{
            loading, setLoading, movieList, setMovieList,
            loggedIn, completeLogin, logout, likedMovies, setPreference, setSessionToken,
            filter, setFilter, search, setSearch, loadingMore, fetchMore
        }}>
            {children}
        </Context.Provider>
    )
}

export function getData() {
    return useContext(Context)
}
