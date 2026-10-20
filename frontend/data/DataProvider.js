import {Alert} from "react-native"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import * as SecureStore from "expo-secure-store"
import {localhost} from './Settings'
import {loadMovies} from "./DataLoader"
import {fetchMovies, fetchFiltered, requestPreferences} from "./APICalls"
import {showToast} from "../components/Toast"

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
    const [filter, setFilter] = useState({
        movieName: "",
        genres: [],
        minRating: null,
        maxRating: null,
        minYear: null,
        maxYear: null,
        showLiked: false,
        showDisliked: false,
        sortBy: "RANDOM",
        descending: true
    })

    currentToken.current = sessionToken

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
        filterVersion.current++
        const requestVersion = filterVersion.current
        if (!loggedIn) {
            setLoading(false)
            return
        }
        setLoading(true)
        fetchFiltered(sessionToken, filter)
            .then(data => {
                if (requestVersion !== filterVersion.current) {
                    return
                }
                setMovieList(loadMovies(data))
                setLoggedIn(data.authorized === true)
                if (!data.authorized) {
                    setLikedMovies({})
                    showToast("Your session expired. Sign in to use your saved movies.")
                    setFilter(prev => ({...prev, showLiked: false, showDisliked: false}))
                }
                setSessionToken(data.sessionToken)
                return SecureStore.setItemAsync("sessionToken", data.sessionToken)
            })
            .catch(() => {
                if (requestVersion === filterVersion.current) {
                    showToast("Couldn't load movies. Check your connection and try again.", true)
                }
            })
            .finally(() => {
                if (requestVersion === filterVersion.current) {
                    setLoading(false)
                }
            })
        return () => {
            filterVersion.current++
        }
    }, [filter])

    async function reqMovies(sessionToken, authorized = loggedIn) {
        const requestVersion = filterVersion.current
        try {
            const data = await fetchMovies(sessionToken, authorized)
            if (currentToken.current !== sessionToken) {
                return
            }
            if (authorized && requestVersion !== filterVersion.current) {
                return
            }
            if (data.authorized && !loggedIn) {
                const preferences = await requestPreferences(data.sessionToken)
                setLikedMovies(preferences.likedMovies)
            }
            if (!data.authorized) {
                setLikedMovies({})
                if (authorized) {
                    setFilter(previous => ({...previous, showLiked: false, showDisliked: false}))
                }
            }

            if (data.sessionToken && data.sessionToken !== sessionToken) {
                await SecureStore.setItemAsync("sessionToken", data.sessionToken)
                setSessionToken(data.sessionToken)
            }

            setMovieList(prev => {
                const movies = authorized && !data.authorized ? loadMovies(data) : [...prev, ...loadMovies(data)]
                return [...new Map(movies.map(movie => [movie.nmid, movie])).values()]
                 // deduplication quickfix
            })
            setLoggedIn(data.authorized === true)
        } catch (e) {
            if (requestVersion === filterVersion.current) {
                showToast("Couldn't load movies. Check your connection and try again.", true)
            }
        }
    }

    useEffect(() => {
        const start = async () => {
            setLoading(true)
            try {
                const token = await SecureStore.getItemAsync("sessionToken")
                setSessionToken(token)
                await reqMovies(token, !!token)
            } catch {
                showToast("Couldn't restore your session. Please try again.", true)
            } finally {
                setLoading(false)
            }
        }
        start()
    }, [])

    async function completeLogin(data) {
        const preferences = await requestPreferences(data.sessionToken)
        await SecureStore.setItemAsync("sessionToken", data.sessionToken)
        setSessionToken(data.sessionToken)
        setLoggedIn(data.authorized === true)
        setLikedMovies(preferences.likedMovies)
        showToast("Signed in. Your movie choices are restored.")
        setMovieList(loadMovies(data))
    }

    async function setPreference(movie, liked) {
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
            if (currentToken.current === sessionToken) {
                Alert.alert("Couldn't save movie choice", error.message)
            }
        } finally {
            savingPreference.current = false
        }
    }

    async function logout() {
        const response = await fetch(localhost + "auth/logout", {
            method: "POST",
            headers: {"Authorization": "Bearer " + sessionToken},
        })
        if (!response.ok && response.status !== 401) throw new Error("Couldn't sign out. Please try again.")

        await SecureStore.deleteItemAsync("sessionToken")
        setSessionToken(null)
        setLoggedIn(false)
        setLikedMovies({})
        showToast("Signed out.")
        setFilter(prev => ({...prev, showLiked: false, showDisliked: false}))
        setMovieList([])
        await reqMovies(null, false)
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

    return (
        <Context.Provider value={{ loading, setLoading, movieList, setMovieList,
            loggedIn, completeLogin, logout, likedMovies, setPreference, setSessionToken,
            filter, setFilter, search, setSearch, loadingMore, fetchMore }}>
            {children}
        </Context.Provider>
    )
}

export function getData() {
    return useContext(Context)
}
