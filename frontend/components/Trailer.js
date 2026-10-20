import {WebView} from "react-native-webview"

export default function Trailer({movie}) {
    const trailer = movie.trailers?.find(item =>
        item.key && ["youtube", "dailymotion"].includes(item.source?.toLowerCase())
    )
    if (!trailer) return null
    const key = encodeURIComponent(trailer.key)
    const uri = trailer.source.toLowerCase() === "youtube"
        ? `https://www.youtube.com/embed/${key}`
        : `https://www.dailymotion.com/video/${key}`

    return (
        <WebView
            source={{
                uri,
                headers: {
                    Referer: "https://some-domain.com/"
                }

        }}
            style={{width: "100%", height: 220}}
            allowsFullscreenVideo
            javaScriptEnabled
            onError={e => console.log(e.nativeEvent)}
        />
    )
}
