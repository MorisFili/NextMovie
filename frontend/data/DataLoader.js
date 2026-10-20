export function loadMovies(data) {
    if (!Array.isArray(data?.movies)) throw new Error("Invalid data format")

    return data.movies.map(incoming => {
        return {
            nmid: String(incoming.nmid),
            Title: incoming.title,
            imdbid: incoming.imdbid,
            Poster: incoming.tmdbPosterPath
                ? `https://image.tmdb.org/t/p/w500${incoming.tmdbPosterPath}`
                : null,
            Genre: (incoming.genres ?? []).map(genre => genre.name).join(", "),
            genres: incoming.genres ?? [],
            Plot: incoming.plot ?? "",
            imdbRating: incoming.imdbRating != null ? incoming.imdbRating.toFixed(1) : "N/A",
            trailers: incoming.trailers ?? []
        }
    })
}
